# AIMF — AI Pipeline Design
# Adaptive Memory Governance Score (AMGS) Processing Pipeline
# Phase 1, Task 1.5
# Last Updated: 2026-07-14
# Status: APPROVED

---

## 1. PIPELINE OVERVIEW

The AMGS pipeline processes a single text input through 9 sequential stages
plus 1 synthesis stage to produce a governance decision. Each stage is
an independent, testable Python module. Stages share data through a single
`PipelineContext` dataclass passed by reference.

```
INPUT TEXT
    │
    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       AMGS PIPELINE                                  │
│                                                                       │
│  Stage 1: Preprocessor        → normalized text, tokens, language    │
│      │                                                                │
│  Stage 2: NER Analyzer         → entities list, entity type flags    │
│      │                                                                │
│  Stage 3: Privacy Analyzer     → P (privacy_risk) ∈ [0.0, 1.0]      │
│      │                                                                │
│  Stage 4: Temporal Detector    → D_raw, expires_at, is_temporal      │
│      │                                                                │
│  Stage 5: Embedding Generator  → embedding[384], content_hash        │
│      │                                                                │
│  Stage 6: Redundancy Detector  → R (redundancy) ∈ [0.0, 1.0]        │
│      │           similar_memories[], top_match_id                    │
│      │                                                                │
│  Stage 7: Novelty Estimator    → N (novelty) ∈ [0.0, 1.0]           │
│      │                                                                │
│  Stage 8: Usefulness Predictor → U (usefulness) ∈ [0.0, 1.0]        │
│      │           memory_category, usefulness_lifetime                │
│      │                                                                │
│  Stage 9: Context Analyzer     → C (context_relevance) ∈ [0.0, 1.0] │
│      │                                                                │
│  Stage 10: AMGS Synthesizer    → AMGS ∈ [0.0, 1.0], F (frequency)   │
│      │                                                                │
│  Decision Engine               → GovernanceDecision enum             │
│      │                                                                │
│  Explainer                     → FactorExplanation object            │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
    │
    ▼
AMGSResult(decision, amgs_score, factors, explanation, metadata)
```

---

## 2. PIPELINE CONTEXT DATACLASS

```python
@dataclass
class PipelineContext:
    # Input
    raw_text: str
    session_id: str | None
    request_id: str

    # Stage 1 outputs
    normalized_text: str = ""
    tokens: list[str] = field(default_factory=list)
    token_count: int = 0
    language: str = "en"
    language_warning: bool = False

    # Stage 2 outputs
    entities: list[dict] = field(default_factory=list)  # [{text, label, start, end}]
    has_person: bool = False
    has_date: bool = False
    has_credential_entity: bool = False

    # Stage 3 outputs
    privacy_risk: float = 0.0           # P factor
    sensitivity_level: SensitivityLevel = SensitivityLevel.LOW
    pii_patterns_found: list[str] = field(default_factory=list)

    # Stage 4 outputs
    temporal_decay_raw: float = 0.0     # D_raw (before aging)
    is_temporal: bool = False
    temporal_ttl_hours: int | None = None
    expires_at: datetime | None = None

    # Stage 5 outputs
    embedding: np.ndarray | None = None  # shape: (384,)
    content_hash: str = ""               # SHA-256 hex

    # Stage 6 outputs
    redundancy: float = 0.0             # R factor
    similar_memories: list[dict] = field(default_factory=list)
    top_match_id: str | None = None
    top_match_similarity: float = 0.0

    # Stage 7 outputs
    novelty: float = 0.0                # N factor

    # Stage 8 outputs
    usefulness: float = 0.0             # U factor
    memory_category: MemoryCategory = MemoryCategory.GENERAL
    usefulness_lifetime: UsefulnessLifetime = UsefulnessLifetime.MEDIUM

    # Stage 9 outputs
    context_relevance: float = 0.0      # C factor
    recent_context_memories: list[str] = field(default_factory=list)

    # Stage 10 outputs
    frequency: float = 0.0             # F factor (from DB lookup)
    amgs_score: float = 0.0            # Final weighted score

    # Decision Engine outputs
    decision: GovernanceDecision | None = None
    confidence: float = 0.0
    review_recommended: bool = False

    # Explainer outputs
    explanation: FactorExplanation | None = None
```

---

## 3. STAGE-BY-STAGE SPECIFICATION

### STAGE 1: Preprocessor (`ai/pipeline/preprocessor.py`)

**Input:** raw_text (str)  
**Output:** normalized_text, tokens, token_count, language, language_warning

```python
Algorithm:
1. Strip leading/trailing whitespace
2. Collapse multiple spaces/newlines to single space
3. Detect language using langdetect (or simple heuristic: check ASCII ratio)
4. If non-English detected: set language_warning = True, continue processing
5. Tokenize with spaCy (reuse shared nlp object — expensive to reload)
6. Return token list and count
```

**Key design decision:** spaCy `nlp` object is loaded once at application
startup (singleton via `ai/embeddings.py` pattern) and shared. Loading per-request
would add 3-5 seconds of latency.

---

### STAGE 2: NER Analyzer (`ai/pipeline/ner_analyzer.py`)

**Input:** normalized_text (uses pre-built spaCy doc from Stage 1)  
**Output:** entities list, has_person, has_date, has_credential_entity

```python
Algorithm:
1. Use spaCy doc.ents (entity spans from en_core_web_sm)
2. For each entity:
   a. Record: text, label, start_char, end_char
   b. If label in {PERSON, GPE}: has_person = True
   c. If label in {DATE, TIME}: has_date = True
3. Additional regex pass for credential-type entities:
   a. EMAIL: r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
   b. PHONE: r'\b(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b'
   c. If matched: has_credential_entity = True, add to entities
4. Return entities list
```

**Note:** entity detection feeds directly into Stage 3 (privacy) and Stage 4
(temporal). spaCy NER runs in the same pass as tokenization in Stage 1.

---

### STAGE 3: Privacy Analyzer (`ai/pipeline/privacy_analyzer.py`)

**Input:** normalized_text, entities (from Stages 1+2)  
**Output:** privacy_risk (P), sensitivity_level, pii_patterns_found

```python
Algorithm:
privacy_risk = 0.0
patterns_found = []

# Rule-based PII pattern detection (all via regex)
PATTERNS = {
    "password":   (r'(?i)(password|passwd|pwd)\s*[:=]\s*\S+', 0.90),
    "api_key":    (r'(?i)(api[_-]?key|token|secret)\s*[:=]\s*\S{8,}', 0.90),
    "ssn":        (r'\b\d{3}-\d{2}-\d{4}\b', 0.95),
    "credit_card":(r'\b(?:\d{4}[-\s]?){4}\b', 0.90),
    "email":      (r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', 0.40),
    "phone":      (r'\b(\+\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b', 0.35),
    "medical":    (r'(?i)\b(diagnosis|medication|dosage|prescription|allergy)\b', 0.55),
    "financial":  (r'(?i)\b(salary|income|bank account|net worth|tax return)\b', 0.50),
}

for pattern_name, (regex, base_score) in PATTERNS.items():
    if re.search(regex, normalized_text):
        privacy_risk = max(privacy_risk, base_score)
        patterns_found.append(pattern_name)

# Entity-based boosts
if context.has_person:
    privacy_risk = max(privacy_risk, 0.30)  # any named person → at least LOW-MEDIUM
if context.has_credential_entity:
    privacy_risk = max(privacy_risk, 0.50)  # credential-type entity detected

# Sensitivity level classification
if privacy_risk >= 0.85:
    sensitivity = SensitivityLevel.CRITICAL
elif privacy_risk >= 0.55:
    sensitivity = SensitivityLevel.HIGH
elif privacy_risk >= 0.25:
    sensitivity = SensitivityLevel.MEDIUM
else:
    sensitivity = SensitivityLevel.LOW
```

**Key test cases:**
  "password: abc123" → P ≈ 0.90, CRITICAL
  "My email is x@y.com" → P ≈ 0.40, MEDIUM
  "I prefer dark mode" → P ≈ 0.00, LOW

---

### STAGE 4: Temporal Detector (`ai/pipeline/temporal_detector.py`)

**Input:** normalized_text, entities (has_date from Stage 2)  
**Output:** temporal_decay_raw (D), is_temporal, temporal_ttl_hours, expires_at

```python
Algorithm:
TEMPORAL_KEYWORDS = {
    "high_decay":  ["today", "tonight", "right now", "this morning",
                    "in a moment", "just now"],        # ttl: 6 hours
    "medium_decay": ["tomorrow", "this week", "next week",
                     "this weekend", "in a few days"], # ttl: 72 hours
    "low_decay":   ["this month", "next month",
                    "this year"],                       # ttl: 720 hours (30d)
}

is_temporal = False
temporal_ttl_hours = None
temporal_decay_raw = 0.0

# Keyword scan
for keyword in TEMPORAL_KEYWORDS["high_decay"]:
    if keyword in normalized_text.lower():
        is_temporal = True
        temporal_decay_raw = 0.90
        temporal_ttl_hours = 6
        break

if not is_temporal:
    for keyword in TEMPORAL_KEYWORDS["medium_decay"]:
        if keyword in normalized_text.lower():
            is_temporal = True
            temporal_decay_raw = 0.65
            temporal_ttl_hours = 72
            break

if not is_temporal:
    for keyword in TEMPORAL_KEYWORDS["low_decay"]:
        if keyword in normalized_text.lower():
            is_temporal = True
            temporal_decay_raw = 0.40
            temporal_ttl_hours = 720
            break

# NER date entity boost
if context.has_date and not is_temporal:
    is_temporal = True
    temporal_decay_raw = 0.50
    temporal_ttl_hours = 168  # 7 days default for NER dates

# Compute expires_at
if temporal_ttl_hours:
    expires_at = datetime.utcnow() + timedelta(hours=temporal_ttl_hours)
```

---

### STAGE 5: Embedding Generator (`ai/embeddings.py`)

**Input:** normalized_text  
**Output:** embedding (np.ndarray shape [384,]), content_hash

```python
Algorithm:
1. embedding = model.encode(normalized_text, normalize_embeddings=True)
   # model = SentenceTransformer('all-MiniLM-L6-v2') — loaded at startup
   # normalize_embeddings=True → unit vectors → cosine sim = dot product
2. content_hash = hashlib.sha256(normalized_text.encode()).hexdigest()
3. return embedding.astype(np.float32), content_hash
```

**Performance note:** SentenceTransformer.encode() is the most expensive
single step (~40-80ms on CPU). Batch encoding is used during experiments.

---

### STAGE 6: Redundancy Detector (`ai/pipeline/redundancy_detector.py`)

**Input:** embedding (from Stage 5)  
**Output:** redundancy (R), similar_memories[], top_match_id, top_match_similarity

```python
Algorithm:
1. Query FAISS index for top-5 nearest neighbors:
   similarities, memory_ids = faiss_index.search(embedding, k=5)
   # Returns cosine similarities (since embeddings are L2-normalized)

2. top_similarity = similarities[0] if len(similarities) > 0 else 0.0
3. top_match_id = memory_ids[0] if top_similarity > 0.30 else None

4. similar_memories = [
       {"id": mid, "similarity": sim, "content_preview": ...}
       for mid, sim in zip(memory_ids, similarities)
       if sim > 0.30  # minimum relevance threshold
   ]

5. # Map similarity to redundancy score
   # At sim=1.0 (exact match) → redundancy=1.0
   # At sim=0.85 (paraphrase) → redundancy=0.90
   # At sim=0.60 (related) → redundancy=0.50
   # At sim=0.30 (weakly related) → redundancy=0.20
   redundancy = max(0.0, (top_similarity - 0.30) / 0.70) if top_similarity > 0.30 else 0.0
   redundancy = min(1.0, redundancy)
```

**FAISS index note:** Using `IndexFlatIP` (inner product) with L2-normalized
embeddings = cosine similarity. Exact search — no approximation needed at
research scale (< 10K memories).

---

### STAGE 7: Novelty Estimator (`ai/pipeline/novelty_estimator.py`)

**Input:** redundancy (R from Stage 6), content_hash  
**Output:** novelty (N)

```python
Algorithm:
# Novelty is primarily the inverse of redundancy, but also checks
# for exact duplicate (content hash match)

# Check exact duplicate first
existing = repo.find_by_hash(content_hash)
if existing:
    novelty = 0.0  # exact same text already stored
    return

# Otherwise, derive from redundancy
# High redundancy = low novelty; low redundancy = high novelty
# Additional signal: if no similar memories exist → maximum novelty
if len(context.similar_memories) == 0:
    novelty = 1.0
else:
    # Novelty = 1 - weighted_average_similarity of top-3 matches
    top3_sims = [m["similarity"] for m in context.similar_memories[:3]]
    avg_sim = sum(top3_sims) / len(top3_sims)
    novelty = max(0.0, 1.0 - avg_sim)
```

**Relationship:** N and R are correlated but not identical. R measures
overlap with the single best match; N measures overall information gain
across the top-K matches.

---

### STAGE 8: Usefulness Predictor (`ai/pipeline/usefulness_predictor.py`)

**Input:** normalized_text, entities, tokens  
**Output:** usefulness (U), memory_category, usefulness_lifetime

```python
Algorithm:
# Memory category classification using keyword heuristics + entity signals

CATEGORY_RULES = {
    MemoryCategory.CREDENTIAL:    (["password", "token", "api key", "login"], 0.85),
    MemoryCategory.PERSONAL_FACT: (["my name", "i am", "i was born", "blood type"], 0.80),
    MemoryCategory.PREFERENCE:    (["i prefer", "i like", "i love", "i hate",
                                    "my favorite", "i dislike"], 0.75),
    MemoryCategory.TEMPORAL_EVENT:(["meeting", "appointment", "deadline", "event",
                                    "tomorrow", "next week"], 0.50),
    MemoryCategory.TASK:          (["todo", "to-do", "remember to", "don't forget"], 0.65),
    MemoryCategory.RELATIONSHIP:  (["my friend", "my colleague", "my boss", "my wife"], 0.70),
    MemoryCategory.HEALTH:        (["medication", "allergy", "diagnosis", "doctor"], 0.80),
    MemoryCategory.FINANCIAL:     (["salary", "income", "budget", "investment"], 0.75),
    MemoryCategory.PROFESSIONAL:  (["my job", "my company", "i work at", "my role"], 0.70),
    MemoryCategory.LOCATION:      (["i live in", "my address", "i am in"], 0.65),
    MemoryCategory.KNOWLEDGE:     (["the answer is", "i learned", "fact:"], 0.60),
    MemoryCategory.TECHNICAL:     (["the code", "my config", "the setting is"], 0.70),
    MemoryCategory.GENERAL:       ([], 0.40),  # fallback
}

# Classify category
best_category = MemoryCategory.GENERAL
best_score = 0.40

for category, (keywords, base_usefulness) in CATEGORY_RULES.items():
    for kw in keywords:
        if kw in normalized_text.lower():
            if base_usefulness > best_score:
                best_score = base_usefulness
                best_category = category
            break

# Boost for entity richness
entity_bonus = min(0.15, len(context.entities) * 0.03)
usefulness = min(1.0, best_score + entity_bonus)

# Penalty for very short inputs (< 5 tokens)
if context.token_count < 5:
    usefulness = min(usefulness, 0.30)

# Usefulness lifetime classification
if best_category in {MemoryCategory.TEMPORAL_EVENT, MemoryCategory.TASK}:
    usefulness_lifetime = UsefulnessLifetime.SHORT
elif best_category in {MemoryCategory.PERSONAL_FACT, MemoryCategory.PREFERENCE,
                       MemoryCategory.RELATIONSHIP, MemoryCategory.HEALTH}:
    usefulness_lifetime = UsefulnessLifetime.PERMANENT
elif best_category == MemoryCategory.CREDENTIAL:
    usefulness_lifetime = UsefulnessLifetime.LONG
else:
    usefulness_lifetime = UsefulnessLifetime.MEDIUM
```

---

### STAGE 9: Context Analyzer (`ai/pipeline/context_analyzer.py`)

**Input:** embedding, session_id  
**Output:** context_relevance (C), recent_context_memories

```python
Algorithm:
# Context window: last N memories from this session within T minutes
# Configurable: AIMF_CONTEXT_WINDOW_SIZE=10, AIMF_CONTEXT_WINDOW_MINUTES=30

recent_memories = repo.get_recent_memories(
    session_id=session_id,
    limit=settings.context_window_size,
    within_minutes=settings.context_window_minutes
)

if not recent_memories:
    context_relevance = 0.5  # neutral — no prior context
    return

# Compute cosine similarity between input and each recent memory
similarities = [
    float(np.dot(embedding, mem.embedding))  # both L2-normalized
    for mem in recent_memories
    if mem.embedding is not None
]

if not similarities:
    context_relevance = 0.5
    return

# Context relevance = weighted average, with higher weight to more recent
weights = [1.0 / (i + 1) for i in range(len(similarities))]  # 1/rank weighting
weighted_sim = sum(s * w for s, w in zip(similarities, weights)) / sum(weights)

# Map to [0, 1]: similarity 0.7+ = highly contextual, 0.2- = off-topic
context_relevance = max(0.0, min(1.0, (weighted_sim - 0.20) / 0.50))
```

---

### STAGE 10: AMGS Synthesizer (`ai/amgs_engine.py`)

**Input:** All factor scores (U, C, F, N, R, P, D_raw)  
**Output:** amgs_score (final scalar)

```python
Algorithm:
# Retrieve frequency score from DB (how often has similar content been submitted)
frequency_count = repo.count_similar_recent(content_hash, within_days=30)
frequency = min(1.0, frequency_count / 10.0)  # normalize: 10+ occurrences = 1.0
context.frequency = frequency

# Apply temporal decay correction
# D is the CURRENT decay (for existing memory re-evaluation)
# For NEW inputs, D_raw from Stage 4 represents how time-sensitive it is
# → Higher D_raw means higher penalty (more ephemeral)
D = context.temporal_decay_raw  # D ∈ [0.0, 1.0]

# Load weights from settings
α = settings.weight_u   # usefulness      (positive)
β = settings.weight_c   # context         (positive)
γ = settings.weight_f   # frequency       (positive)
δ = settings.weight_n   # novelty         (positive)
ε = settings.weight_r   # redundancy      (penalty)
ζ = settings.weight_p   # privacy risk    (penalty)
η = settings.weight_d   # temporal decay  (penalty)

# AMGS formula
amgs_score = (
    α * context.usefulness +
    β * context.context_relevance +
    γ * frequency +
    δ * context.novelty
    - ε * context.redundancy
    - ζ * context.privacy_risk
    - η * D
)

# Clamp to [0.0, 1.0]
amgs_score = max(0.0, min(1.0, amgs_score))
context.amgs_score = amgs_score
```

**Version tracking:** Any change to this formula = new AMGS version. Logged
in RESEARCH_LOG.md before implementation.

---

## 4. DECISION ENGINE (`ai/decision_engine.py`)

```python
Algorithm (priority-ordered):
1. REJECT if privacy_risk ≥ THRESHOLD_REJECT_PRIV (0.95)
2. REJECT if amgs_score < THRESHOLD_SUMMARIZE (0.30) [low value]
3. ENCRYPT_AND_STORE if privacy_risk ≥ THRESHOLD_ENCRYPT (0.85) and amgs ≥ 0.30
4. FORGET if context is re-evaluation and decayed_amgs < THRESHOLD_FORGET (0.15)
5. UPDATE_EXISTING if contradiction detected with existing memory
6. MERGE_WITH_EXISTING if top_match_similarity ≥ THRESHOLD_REDUNDANCY (0.85)
7. STORE_TEMPORARY if is_temporal = True and amgs ≥ 0.30
8. STORE_LONG_TERM if amgs_score ≥ THRESHOLD_LONG_TERM (0.75)
9. SUMMARIZE_AND_STORE if amgs_score ≥ THRESHOLD_SUMMARIZE (0.30)

Confidence computation:
  high_confidence_signals = 0
  if privacy_risk > 0.85 or privacy_risk < 0.10: high_confidence_signals += 1
  if redundancy > 0.90 or redundancy < 0.10: high_confidence_signals += 1
  if amgs_score > 0.80 or amgs_score < 0.20: high_confidence_signals += 1
  confidence = 0.50 + (high_confidence_signals * 0.15)  # max: 0.95
  review_recommended = confidence < 0.65
```

---

## 5. EXPLAINER (`ai/explainer.py`)

```python
Algorithm:
# Generates FactorExplanation from PipelineContext

FactorExplanation:
  - factors: dict of {factor_name: score}
  - rationale: str (human-readable summary)
  - decision_boundary: str (which threshold triggered the decision)
  - dominant_factor: str (factor with highest absolute weight contribution)
  - privacy_patterns: list[str] (matched PII patterns if any)
  - similar_memory_id: str | None (top match for MERGE/UPDATE decisions)

# Rationale generation (template-based, not LLM-generated)
Templates:
  REJECT (privacy): "Input rejected: detected {patterns} indicating {level}
                     privacy risk ({P:.2f}). Storage would expose sensitive data."
  REJECT (low AMGS): "Input rejected: computed AMGS score ({amgs:.2f}) below
                      minimum storage threshold ({threshold}). Input lacks
                      sufficient utility, novelty, or context relevance."
  ENCRYPT: "Input encrypted before storage: privacy risk score ({P:.2f}) exceeds
            encryption threshold. Content is stored but protected with AES-256-GCM."
  STORE_LONG_TERM: "Input approved for long-term storage: AMGS={amgs:.2f},
                    driven by {dominant_factor} ({score:.2f})."
  STORE_TEMPORARY: "Input stored temporarily until {expires_at}: temporal
                    signal detected (D={D:.2f}). Expires automatically."
  ... (one template per decision)
```

---

## 6. BASELINE POLICY IMPLEMENTATIONS

### Baseline A: Store Everything (`services/baseline_service.py`)
```python
def decide_store_all(input_text: str) -> BaselineDecision:
    return BaselineDecision(decision=GovernanceDecision.STORE_LONG_TERM,
                            policy="store_all",
                            latency_ms=0.1)
```

### Baseline B: Fixed TTL
```python
def decide_fixed_ttl(input_text: str, ttl: str = "24h") -> BaselineDecision:
    hours = {"24h": 24, "7d": 168, "30d": 720}[ttl]
    return BaselineDecision(
        decision=GovernanceDecision.STORE_TEMPORARY,
        expires_at=datetime.utcnow() + timedelta(hours=hours),
        policy="fixed_ttl"
    )
```

### Baseline C: Static Rules
```python
def decide_static_rules(input_text: str) -> BaselineDecision:
    text_lower = input_text.lower()
    if re.search(r'(?i)(password|api.?key|ssn|\d{3}-\d{2}-\d{4})', input_text):
        return BaselineDecision(decision=GovernanceDecision.REJECT, ...)
    if any(kw in text_lower for kw in ["tomorrow", "tonight", "next week"]):
        return BaselineDecision(decision=GovernanceDecision.STORE_TEMPORARY, ...)
    return BaselineDecision(decision=GovernanceDecision.STORE_LONG_TERM, ...)
```

### Baseline D: Recency + Similarity
```python
def decide_recency_similarity(input_text: str, embedding: np.ndarray) -> BaselineDecision:
    recent_sims = faiss_index.search_recent(embedding, k=1, within_hours=24)
    if recent_sims and recent_sims[0] > 0.85:
        return BaselineDecision(decision=GovernanceDecision.REJECT, ...)
    return BaselineDecision(decision=GovernanceDecision.STORE_LONG_TERM, ...)
```

---

## 7. TEMPORAL DECAY ENGINE (`ai/decay_engine.py`)

For computing the decayed AMGS of an existing stored memory:

```python
def compute_decayed_amgs(memory: Memory, current_time: datetime) -> float:
    """
    Apply temporal decay to reduce AMGS over time.
    Uses exponential decay: AMGS(t) = AMGS_0 × e^(-λt)
    where t = days since last access, λ = ln(2) / half_life_days
    """
    days_since_access = (current_time - memory.last_accessed).days
    half_life = settings.decay_half_life_days  # default: 30

    λ = math.log(2) / half_life
    decay_factor = math.exp(-λ * days_since_access)

    # Access count reinforcement: each access adds +0.02 to decay_factor, max +0.20
    reinforcement = min(0.20, memory.access_count * 0.02)
    decay_factor = min(1.0, decay_factor + reinforcement)

    decayed_amgs = memory.amgs_score * decay_factor
    return max(0.0, decayed_amgs)
```

---

## 8. MODEL LOADING STRATEGY (Startup Singletons)

Both spaCy and sentence-transformers are expensive to load. They are loaded
ONCE at application startup and shared across all requests:

```python
# In main.py lifespan event handler:
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    app.state.nlp = spacy.load("en_core_web_sm")
    app.state.embedding_model = SentenceTransformer("all-MiniLM-L6-v2")
    app.state.faiss_index = FAISSIndex.load(settings.faiss_index_path)
    yield
    # Shutdown
    app.state.faiss_index.save(settings.faiss_index_path)
```

Models are passed via FastAPI dependency injection to service/AI layers.

---

## 9. PIPELINE ERROR HANDLING

```
Each stage must:
  - Never raise unhandled exceptions
  - On stage failure: log error, set factor to safe default, continue pipeline
  - Safe defaults: P=0.5 (cautious), N=0.5, U=0.5, C=0.5, R=0.0, D=0.0, F=0.0
  - Log: stage_name, error_message, input_hash, request_id
  - Set review_recommended=True if any stage fails

Pipeline failures must not surface to API as unhandled 500 errors.
The AMGSResult must always be returned with whatever data is available.
```

---

## 10. ENUMS USED THROUGHOUT PIPELINE

```python
class GovernanceDecision(str, Enum):
    REJECT = "REJECT"
    STORE_TEMPORARY = "STORE_TEMPORARY"
    STORE_LONG_TERM = "STORE_LONG_TERM"
    SUMMARIZE_AND_STORE = "SUMMARIZE_AND_STORE"
    ENCRYPT_AND_STORE = "ENCRYPT_AND_STORE"
    MERGE_WITH_EXISTING = "MERGE_WITH_EXISTING"
    UPDATE_EXISTING = "UPDATE_EXISTING"
    FORGET = "FORGET"

class SensitivityLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

class MemoryCategory(str, Enum):
    CREDENTIAL = "CREDENTIAL"
    PERSONAL_FACT = "PERSONAL_FACT"
    PREFERENCE = "PREFERENCE"
    TEMPORAL_EVENT = "TEMPORAL_EVENT"
    TASK = "TASK"
    RELATIONSHIP = "RELATIONSHIP"
    HEALTH = "HEALTH"
    FINANCIAL = "FINANCIAL"
    PROFESSIONAL = "PROFESSIONAL"
    LOCATION = "LOCATION"
    KNOWLEDGE = "KNOWLEDGE"
    TECHNICAL = "TECHNICAL"
    GENERAL = "GENERAL"

class UsefulnessLifetime(str, Enum):
    EPHEMERAL = "EPHEMERAL"   # hours
    SHORT = "SHORT"            # days
    MEDIUM = "MEDIUM"          # weeks
    LONG = "LONG"              # months
    PERMANENT = "PERMANENT"    # no expiry
```

---

## 11. AMGS v1 WEIGHT VALUES AND RATIONALE

| Factor | Symbol | Weight | Rationale |
|--------|--------|--------|-----------|
| Usefulness | α | 0.25 | Dominant factor — utility drives retention |
| Novelty | δ | 0.20 | Second most important — new info is valuable |
| Context relevance | β | 0.15 | Important for session coherence |
| Frequency | γ | 0.15 | Recurrence = reinforced value |
| Redundancy | ε | 0.10 | Penalty — modest, not absolute bar |
| Privacy risk | ζ | 0.10 | Penalty — governs form, not rejection alone |
| Temporal decay | η | 0.05 | Smallest penalty — time-sensitivity is rare |

Weight sum verification:
  Positive: α + β + γ + δ = 0.25 + 0.15 + 0.15 + 0.20 = 0.75
  Negative: ε + ζ + η = 0.10 + 0.10 + 0.05 = 0.25
  Max possible AMGS (all positive = 1.0, all negative = 0.0) = 0.75
  Min possible AMGS (all positive = 0.0, all negative = 1.0) = -0.25 → clamped to 0.0

**These weights are AMGS v1 (Phase 2 implementation).**
AMGS v2 (Phase 11) will optimize weights via grid search or Bayesian optimization.
Any weight change requires RESEARCH_LOG.md entry and DECISIONS.md ADR update.

---
_Document Owner: AIMF AI Team_
_Status: APPROVED — Ready for Phase 2 implementation_
_Last Reviewed: 2026-07-14_
