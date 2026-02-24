import { useState } from 'react'
import { useAnalysis } from './hooks/useAnalysis'
import { AuthScreen } from './screens/AuthScreen'
import { HistoryScreen } from './screens/HistoryScreen'
import { HomeScreen } from './screens/HomeScreen'
import { ResultsScreen } from './screens/ResultsScreen'
import type { AnalysisResult, Screen } from './types'

export default function App() {
  const [screen, setScreen] = useState<Screen>(() =>
    localStorage.getItem('token') ? 'home' : 'auth'
  )
  const [savedResult, setSavedResult] = useState<{ result: AnalysisResult; url: string; analysisId: number } | null>(null)

  const { state, analyze, reset } = useAnalysis()

  function handleAuth(token: string) {
    localStorage.setItem('token', token)
    setScreen('home')
  }

  function handleLogout() {
    localStorage.removeItem('token')
    reset()
    setSavedResult(null)
    setScreen('auth')
  }

  function handleAnalyze(input: string, mode: 'url' | 'jd') {
    setSavedResult(null)
    analyze(input, mode)
  }

  function handleNew() {
    reset()
    setSavedResult(null)
    setScreen('home')
  }

  function handleLoadFromHistory(result: AnalysisResult, url: string, id: number) {
    setSavedResult({ result, url, analysisId: id })
    setScreen('results')
  }

  // Transition to results when analysis completes
  const activeResult =
    savedResult ??
    (state.status === 'done' ? { result: state.result, url: state.url, analysisId: state.analysisId } : null)

  if (activeResult && screen !== 'history') {
    return (
      <ResultsScreen
        result={activeResult.result}
        url={activeResult.url}
        analysisId={activeResult.analysisId}
        onNew={handleNew}
        onHistory={() => setScreen('history')}
      />
    )
  }

  if (screen === 'history') {
    return (
      <HistoryScreen
        onBack={() => setScreen(activeResult ? 'results' : 'home')}
        onLoad={handleLoadFromHistory}
      />
    )
  }

  if (screen === 'auth') {
    return <AuthScreen onAuth={handleAuth} />
  }

  return (
    <HomeScreen
      loading={state.status === 'loading'}
      steps={state.status === 'loading' ? state.steps : []}
      mode={state.status === 'loading' ? state.mode : 'url'}
      error={state.status === 'error' ? state.message : ''}
      onAnalyze={handleAnalyze}
      onHistory={() => setScreen('history')}
      onLogout={handleLogout}
    />
  )
}




// // Testing - ResultsScreen
// import { ResultsScreen } from './screens/ResultsScreen'
// import type { AnalysisResult } from './types'

// const mockResult: AnalysisResult = {
//   "role": "AI Solutions Engineer",
//   "company": "Cook Medical",
//   "location": "Bloomington, Indiana, USA",
//   "skills": [
//     {
//       "name": "Python",
//       "primary": true
//     },
//     {
//       "name": "Java",
//       "primary": true
//     },
//     {
//       "name": "TypeScript/JavaScript",
//       "primary": true
//     },
//     {
//       "name": "C++",
//       "primary": true
//     },
//     {
//       "name": "LLM Application Development (RAG, Prompt Design)",
//       "primary": true
//     },
//     {
//       "name": "Machine Learning Engineering / MLOps",
//       "primary": true
//     },
//     {
//       "name": "Data Engineering (Pipelines, APIs, Databases, Event Streams)",
//       "primary": true
//     },
//     {
//       "name": "Cloud Platforms (AWS / Azure / GCP)",
//       "primary": true
//     },
//     {
//       "name": "Docker / Kubernetes",
//       "primary": true
//     },
//     {
//       "name": "CI/CD",
//       "primary": true
//     },
//     {
//       "name": "React (Frontend / Full-Stack)",
//       "primary": true
//     },
//     {
//       "name": "Vector Databases",
//       "primary": true
//     },
//     {
//       "name": "Model Evaluation and Monitoring",
//       "primary": true
//     },
//     {
//       "name": "Secure-by-Design / AI Safety Practices",
//       "primary": true
//     },
//     {
//       "name": "Go",
//       "primary": false
//     },
//     {
//       "name": "Node.js",
//       "primary": false
//     },
//     {
//       "name": "Enterprise Data/AI Platform Integration",
//       "primary": false
//     },
//     {
//       "name": "Product and Business Health Metrics",
//       "primary": false
//     },
//     {
//       "name": "Regulated Environment Experience (Healthcare / Life Sciences)",
//       "primary": false
//     }
//   ],
//   "topics": [
//     {
//       "name": "AI/LLM Application Development",
//       "weight": 95
//     },
//     {
//       "name": "Data Engineering and Pipeline Development",
//       "weight": 75
//     },
//     {
//       "name": "Cloud Infrastructure and DevOps",
//       "weight": 70
//     },
//     {
//       "name": "Full-Stack Software Engineering",
//       "weight": 65
//     },
//     {
//       "name": "ML Operations and Model Monitoring",
//       "weight": 60
//     },
//     {
//       "name": "AI Safety, Ethics, and Compliance",
//       "weight": 55
//     },
//     {
//       "name": "Stakeholder Collaboration and Discovery",
//       "weight": 50
//     },
//     {
//       "name": "Healthcare Domain / Regulated Environments",
//       "weight": 35
//     },
//     {
//       "name": "Product Metrics and Adoption",
//       "weight": 30
//     },
//     {
//       "name": "Agile / Iterative Delivery",
//       "weight": 25
//     }
//   ],
//   "questions": {
//     "technical": [
//       {
//         "text": "Explain the Retrieval-Augmented Generation (RAG) architecture. How would you design a RAG pipeline for a medical device documentation assistant at Cook Medical, and what specific challenges would you anticipate in a regulated healthcare environment?",
//         "difficulty": "Hard",
//         "topic": "RAG Systems & Healthcare AI",
//         "hint": "Cover chunking strategies, embedding model selection, vector similarity search, re-ranking, and citation traceability. Address FDA/HIPAA compliance, hallucination risk in clinical contexts, and auditability of retrieved sources."
//       },
//       {
//         "text": "What is the difference between a prompt template and a prompt chain? Walk through how you would design and evaluate a multi-step prompt chain for automating a regulatory compliance check workflow.",
//         "difficulty": "Medium",
//         "topic": "LLM Prompt Design & Evaluation",
//         "hint": "Discuss structured output parsing, chain-of-thought prompting, and intermediate validation steps. Mention evaluation frameworks like RAGAS or LangSmith, and how you measure faithfulness, relevance, and correctness."
//       },
//       {
//         "text": "You are building an event-driven data pipeline that ingests real-time data from medical device telemetry streams and loads it into a vector database for downstream LLM querying. Describe your architecture choices and how you would ensure data quality and lineage.",
//         "difficulty": "Hard",
//         "topic": "Data Engineering & Vector Databases",
//         "hint": "Reference tools like Kafka or AWS Kinesis for event streams, Apache Airflow or dbt for orchestration, and vector stores like Pinecone, Weaviate, or pgvector. Address schema validation, dead-letter queues, and data lineage tracking with tools like OpenLineage."
//       },
//       {
//         "text": "What is a vector database and how does it differ from a traditional relational database? When would you choose pgvector over a dedicated vector store like Pinecone or Weaviate?",
//         "difficulty": "Easy",
//         "topic": "Vector Databases",
//         "hint": "Explain approximate nearest neighbor (ANN) search and embedding storage. Contrast operational tradeoffs: pgvector suits lower scale with existing Postgres infrastructure, while dedicated stores offer better performance, filtering, and scalability at high vector counts."
//       },
//       {
//         "text": "Describe how you would implement guardrails for an LLM assistant deployed internally at a medical device company. What categories of risk would you guard against, and what technical mechanisms would you use?",
//         "difficulty": "Hard",
//         "topic": "AI Safety, Guardrails & Compliance",
//         "hint": "Cover input/output filtering, topic classifiers, PII redaction, toxicity detection, and off-topic refusals. Reference frameworks like Guardrails AI or NeMo Guardrails. Address regulated-environment concerns: audit logs, human-in-the-loop escalation, and incident response procedures."
//       },
//       {
//         "text": "Walk through how you would containerize a Python FastAPI backend and a TypeScript/React frontend, deploy them to Kubernetes on AWS EKS, and set up a CI/CD pipeline for automated deployments.",
//         "difficulty": "Medium",
//         "topic": "Cloud Infrastructure & CI/CD",
//         "hint": "Mention Dockerfiles, multi-stage builds, Helm charts or Kubernetes manifests, and ingress controllers. For CI/CD, reference GitHub Actions or AWS CodePipeline with steps for linting, testing, image build/push to ECR, and rolling deployments with health checks."
//       },
//       {
//         "text": "What is ML model monitoring, and how does it differ from traditional application monitoring? Describe the key metrics you would track for a production LLM-based system and how you would detect and respond to model drift.",
//         "difficulty": "Medium",
//         "topic": "ML Operations & Model Monitoring",
//         "hint": "Distinguish infrastructure metrics (latency, error rate) from model-quality metrics (output coherence, retrieval relevance, embedding drift, label distribution shift). Reference tools like Evidently AI, Arize, or AWS SageMaker Model Monitor, and describe alerting thresholds and retraining triggers."
//       },
//       {
//         "text": "In Python, what is the difference between a generator and a regular list-returning function, and when would using a generator be preferable when processing large datasets in a data pipeline?",
//         "difficulty": "Easy",
//         "topic": "Python & Data Engineering Fundamentals",
//         "hint": "Explain lazy evaluation and memory efficiency using the yield keyword. A generator is preferable when processing large files or database result sets record-by-record to avoid loading the entire dataset into memory, which is critical in high-volume telemetry or log ingestion pipelines."
//       }
//     ],
//     "sysdesign": [
//       {
//         "text": "Cook Medical wants to build a RAG-based assistant that allows clinical engineers to query thousands of device manuals, adverse event reports, and regulatory filings (FDA 510(k) submissions, MDR reports). The corpus is 50GB+ of PDFs and grows by ~500 documents per week. Design the end-to-end RAG pipeline \u2014 from ingestion to query-time retrieval \u2014 that can serve 200 concurrent internal users with sub-3-second response times while ensuring retrieved content is always traceable to its source document and version.",
//         "difficulty": "Hard",
//         "topic": "RAG System Architecture",
//         "hint": "Cover chunking strategies for technical PDFs (section-aware vs. fixed-size), embedding model selection and refresh cadence, vector store choice (pgvector vs. Pinecone vs. OpenSearch), hybrid retrieval (dense + BM25 sparse), metadata filtering by document type and version, and how you maintain a document lineage store to satisfy auditability. Discuss incremental indexing so new docs appear without full re-index."
//       },
//       {
//         "text": "Cook Medical's LLM assistant will be used by regulatory affairs teams to draft responses to FDA inquiries. A hallucinated or out-of-scope answer could trigger a compliance violation. Design a guardrails and human-in-the-loop (HITL) architecture that prevents the model from generating content outside approved source material, flags low-confidence outputs for human review, and produces a full audit trail of every query, retrieved context, model response, and reviewer decision \u2014 all in a way that satisfies 21 CFR Part 11 electronic records requirements.",
//         "difficulty": "Hard",
//         "topic": "LLM Guardrails, Evaluation, and Compliance",
//         "hint": "Discuss input/output guardrail layers (topic classifiers, PII redactors, grounding checks via faithfulness scoring), a confidence threshold that routes to a human review queue, an immutable append-only audit log (event sourcing pattern), e-signature integration for reviewer approval, and an offline evaluation harness with a golden QA dataset to catch regressions before deployment. Mention how you version prompts alongside model versions."
//       },
//       {
//         "text": "Cook Medical operates across 40+ countries and has patient data, device telemetry, and ERP records sitting in a mix of on-premise Oracle databases, Azure Data Lake, and legacy HL7 FHIR endpoints. Design a data pipeline that continuously feeds cleaned, governed, and de-identified data into the AI platform so models always train and retrieve from fresh, high-quality data. The pipeline must enforce data lineage, schema validation, and role-based access so that GDPR (EU) and HIPAA (US) obligations are met simultaneously.",
//         "difficulty": "Hard",
//         "topic": "Enterprise AI Data Pipelines and Governance",
//         "hint": "Address ingestion patterns (CDC for Oracle, event streams for telemetry), a medallion architecture (bronze/silver/gold) with quality checks at each layer, a metadata/lineage catalog (Apache Atlas or OpenMetadata), tokenization and de-identification at the silver layer before data reaches the AI layer, column-level access controls tied to identity provider groups, and how you handle right-to-erasure requests without breaking downstream model training artifacts."
//       },
//       {
//         "text": "Cook Medical's AI platform must be deployed across two cloud regions (US-East on AWS, EU-West on Azure) to meet data residency requirements, with a target of 99.9% availability and an RTO of 15 minutes. The system includes a RAG service, an LLM inference gateway, a vector database, and a monitoring stack. Design the cloud-native deployment architecture using containers and Kubernetes, and explain how you handle secrets management, cross-cloud networking, CI/CD promotion gates, and failover \u2014 without allowing EU patient data to leave the EU region.",
//         "difficulty": "Medium",
//         "topic": "Cloud-Native Deployment and Multi-Region Architecture",
//         "hint": "Cover separate Kubernetes clusters per region (EKS + AKS) with a GitOps CD pipeline (ArgoCD), regional vector DB replicas with no cross-region replication for PII data, a secrets manager per cloud abstracted via External Secrets Operator, an LLM inference gateway that routes by user geography, health-check-driven failover within a region, and canary deployment gates tied to automated eval scores before full rollout."
//       },
//       {
//         "text": "Six months after deploying a document classification model that routes incoming complaint reports to the correct quality team at Cook Medical, you notice the model's precision has dropped from 94% to 81% with no code changes. Design an ML model monitoring and observability system that would have detected this degradation early, identified the root cause, and triggered an automated remediation or escalation workflow.",
//         "difficulty": "Medium",
//         "topic": "ML Model Monitoring and Observability",
//         "hint": "Discuss input data drift detection (population stability index, KL divergence on feature distributions), prediction distribution shift monitoring, ground-truth label collection via a delayed feedback loop, automated retraining triggers vs. human escalation criteria, a dashboard (Grafana + custom ML metrics) tied to structured logs, and shadow-mode deployment of a challenger model to validate fixes before swapping production traffic."
//       }
//     ],
//     "behavioral": [
//       {
//         "text": "Tell me about a time you took full ownership of an AI or technical project from problem definition through delivery. How did you define success metrics, and what did you do when things did not go as planned?",
//         "difficulty": "Medium",
//         "topic": "Ownership & Accountability",
//         "hint": "Interviewers want evidence you can own discovery and delivery end-to-end without being directed at every step. Emphasize how you independently defined the problem and success metrics, the specific obstacles you hit, and the concrete decisions you made to keep the project on track."
//       },
//       {
//         "text": "Describe a situation where you had to translate a vague or ambiguous business problem into a scoped AI solution. How did you go from an unclear ask to a concrete delivery plan?",
//         "difficulty": "Hard",
//         "topic": "Ambiguity Handling & Problem Scoping",
//         "hint": "This maps directly to turning ambiguous problems into production-grade AI systems and scoping MVPs. Show your structured thinking process \u2014 how you asked clarifying questions, identified constraints, scoped an MVP, and built in fast feedback loops to course-correct based on early signals."
//       },
//       {
//         "text": "Give me an example of a time you had to present an AI initiative or technical recommendation to both executives and domain experts in the same setting. How did you tailor your communication, and what was the outcome?",
//         "difficulty": "Medium",
//         "topic": "Stakeholder Communication & Cross-functional Influence",
//         "hint": "Interviewers are probing the ability to communicate effectively across audiences including executives, domain experts, and engineers. Highlight how you adapted your framing for each audience in the same session and tie the outcome to a measurable business or adoption result."
//       },
//       {
//         "text": "Tell me about a time an AI model or system you built produced results that were technically sound but raised concerns around fairness, transparency, or regulatory compliance. How did you handle it?",
//         "difficulty": "Hard",
//         "topic": "AI Ethics, Trust & Regulatory Compliance",
//         "hint": "Interviewers are probing alignment with Cook's core values of integrity, transparency, and respect, and the requirement that every AI initiative aligns with ethical standards and regulatory compliance. Focus on how you identified the concern, who you looped in, what tradeoffs you weighed, and how you resolved it without simply abandoning the project."
//       },
//       {
//         "text": "Describe a time you led the rollout of a new AI tool or workflow to a team that was resistant or unfamiliar with the technology. What steps did you take to drive adoption?",
//         "difficulty": "Easy",
//         "topic": "Change Management & Adoption",
//         "hint": "This maps to leading change management through demos, training, and clear communication, and tracking adoption/quality/ROI. Be specific about the enablement tactics you used \u2014 demos, documentation, training sessions \u2014 and include a concrete adoption or impact metric that showed the rollout succeeded."
//       }
//     ]
//   }
// }
// function App() {
//   return (
//     <ResultsScreen
//       result={mockResult}
//       url="https://jobs.cookmedical.com/job/ai-solutions-engineer"
//       onNew={() => console.log('New job clicked')}
//       onHistory={() => console.log('History clicked')}
//     />
//   )
// }

// export default App
