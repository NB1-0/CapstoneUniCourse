import re
import unicodedata


def clean_text(text: str) -> str:
    if not text:
        return ""
    text = re.sub(r"<[^>]+>", " ", text)
    text = unicodedata.normalize("NFKD", text)
    text = re.sub(r"[^\w\s\-.,!?']", " ", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def parse_enrolled(val) -> int:
    """Convert '5.3k', '17k', '3.2m', '1,200' etc. to int."""
    if val is None:
        return 0
    s = str(val).strip().lower().replace(",", "").replace(" ", "")
    try:
        if s.endswith("m"):
            return int(float(s[:-1]) * 1_000_000)
        if s.endswith("k"):
            return int(float(s[:-1]) * 1_000)
        return int(float(s))
    except (ValueError, TypeError):
        return 0


# Keyword → skills mapping used when no explicit skills column exists
_TITLE_SKILL_MAP: list[tuple[str, list[str]]] = [
    ("machine learning", ["Machine Learning", "Python", "Statistics", "Scikit-learn"]),
    ("deep learning", ["Deep Learning", "Neural Networks", "TensorFlow", "Python"]),
    ("neural network", ["Neural Networks", "Deep Learning", "Python"]),
    ("natural language processing", ["NLP", "Python", "TensorFlow", "BERT"]),
    ("nlp", ["NLP", "Python", "TensorFlow", "BERT"]),
    ("computer vision", ["Computer Vision", "CNNs", "TensorFlow", "Python"]),
    ("reinforcement learning", ["Reinforcement Learning", "Python", "Machine Learning"]),
    ("generative ai", ["Generative AI", "LLMs", "Python", "Transformers"]),
    ("large language model", ["LLMs", "Generative AI", "Python", "Transformers"]),
    ("llm", ["LLMs", "Generative AI", "Python", "Transformers"]),
    ("gpt", ["LLMs", "Generative AI", "Python", "OpenAI"]),
    ("bert", ["BERT", "NLP", "Transformers", "Python"]),
    ("transformer", ["Transformers", "NLP", "Deep Learning", "Python"]),
    ("tensorflow", ["TensorFlow", "Deep Learning", "Python"]),
    ("pytorch", ["PyTorch", "Deep Learning", "Python"]),
    ("keras", ["Keras", "TensorFlow", "Deep Learning", "Python"]),
    ("data science", ["Data Science", "Python", "Machine Learning", "Statistics"]),
    ("data analytics", ["Data Analysis", "SQL", "Tableau", "Excel", "Statistics"]),
    ("data analysis", ["Data Analysis", "Python", "SQL", "Excel"]),
    ("data engineering", ["Data Engineering", "Python", "SQL", "Apache Spark"]),
    ("data visualization", ["Data Visualization", "Tableau", "Python", "Excel"]),
    ("data warehouse", ["Data Warehousing", "SQL", "ETL", "Business Intelligence"]),
    ("data warehous", ["Data Warehousing", "SQL", "ETL", "Business Intelligence"]),
    ("business intelligence", ["Business Intelligence", "Tableau", "SQL", "Power BI"]),
    ("business analytics", ["Business Intelligence", "Data Analysis", "Excel", "Statistics"]),
    ("sql", ["SQL", "Database Management", "Data Analysis"]),
    ("python", ["Python", "Data Science", "Programming"]),
    ("r programming", ["R", "Statistics", "Data Analysis"]),
    ("javascript", ["JavaScript", "Web Development", "Node.js"]),
    ("typescript", ["TypeScript", "JavaScript", "React"]),
    ("java ", ["Java", "Object-Oriented Programming", "Backend Development"]),
    ("scala", ["Scala", "Apache Spark", "Big Data"]),
    ("golang", ["Go", "Backend Development", "Microservices"]),
    ("rust", ["Rust", "Systems Programming"]),
    ("c++", ["C++", "Systems Programming", "Algorithms"]),
    ("react", ["React", "JavaScript", "Frontend Development"]),
    ("angular", ["Angular", "TypeScript", "Frontend Development"]),
    ("vue", ["Vue.js", "JavaScript", "Frontend Development"]),
    ("node.js", ["Node.js", "JavaScript", "Backend Development"]),
    ("web development", ["HTML", "CSS", "JavaScript", "Web Development"]),
    ("full stack", ["React", "Node.js", "JavaScript", "REST APIs", "MongoDB"]),
    ("front-end", ["HTML", "CSS", "JavaScript", "React"]),
    ("front end", ["HTML", "CSS", "JavaScript", "React"]),
    ("back-end", ["Node.js", "Python", "SQL", "REST APIs"]),
    ("back end", ["Node.js", "Python", "SQL", "REST APIs"]),
    ("api", ["REST APIs", "Python", "JSON"]),
    ("cloud", ["Cloud Computing", "AWS", "Azure", "GCP"]),
    ("aws", ["AWS", "Cloud Computing", "Cloud Architecture"]),
    ("azure", ["Azure", "Cloud Computing", "Microsoft"]),
    ("google cloud", ["GCP", "Cloud Computing", "BigQuery"]),
    ("gcp", ["GCP", "Cloud Computing", "BigQuery"]),
    ("devops", ["DevOps", "Docker", "Kubernetes", "CI/CD"]),
    ("docker", ["Docker", "Kubernetes", "DevOps"]),
    ("kubernetes", ["Kubernetes", "Docker", "DevOps"]),
    ("mlops", ["MLOps", "Docker", "Kubernetes", "Python", "ML Pipelines"]),
    ("ci/cd", ["CI/CD", "DevOps", "Git"]),
    ("spark", ["Apache Spark", "Python", "Big Data"]),
    ("hadoop", ["Hadoop", "Big Data", "Java"]),
    ("kafka", ["Kafka", "Data Engineering", "Streaming"]),
    ("airflow", ["Airflow", "ETL", "Data Engineering", "Python"]),
    ("dbt", ["dbt", "SQL", "Data Engineering"]),
    ("tableau", ["Tableau", "Data Visualization", "Business Intelligence"]),
    ("power bi", ["Power BI", "Data Visualization", "Business Intelligence"]),
    ("excel", ["Excel", "Data Analysis", "Business Intelligence"]),
    ("cybersecurity", ["Cybersecurity", "Networking", "Security", "Linux"]),
    ("security", ["Security", "Cybersecurity", "Networking"]),
    ("networking", ["Networking", "Linux", "TCP/IP"]),
    ("linux", ["Linux", "Bash", "DevOps"]),
    ("agile", ["Agile", "Scrum", "Project Management"]),
    ("scrum", ["Scrum", "Agile", "Project Management"]),
    ("project management", ["Project Management", "Agile", "Leadership"]),
    ("leadership", ["Leadership", "Management", "Communication"]),
    ("statistics", ["Statistics", "Python", "Data Analysis", "Probability"]),
    ("probability", ["Statistics", "Probability", "Mathematics"]),
    ("calculus", ["Calculus", "Mathematics", "Machine Learning"]),
    ("linear algebra", ["Linear Algebra", "Mathematics", "Machine Learning"]),
    ("algorithm", ["Algorithms", "Data Structures", "Python"]),
    ("data structure", ["Data Structures", "Algorithms", "Python"]),
    ("database", ["SQL", "Database Management", "PostgreSQL"]),
    ("postgresql", ["PostgreSQL", "SQL", "Database Management"]),
    ("mongodb", ["MongoDB", "NoSQL", "Database Management"]),
    ("nosql", ["NoSQL", "MongoDB", "Database Management"]),
    ("redis", ["Redis", "Cache", "NoSQL"]),
    ("blockchain", ["Blockchain", "Cryptocurrency", "Ethereum"]),
    ("cryptocurrency", ["Cryptocurrency", "Blockchain", "Finance"]),
    ("prompt engineering", ["Prompt Engineering", "LLMs", "ChatGPT", "Generative AI"]),
    ("chatgpt", ["ChatGPT", "LLMs", "Prompt Engineering", "Generative AI"]),
    ("openai", ["OpenAI", "LLMs", "Python", "Generative AI"]),
    ("finance", ["Finance", "Excel", "Statistics", "Business Intelligence"]),
    ("financial", ["Finance", "Excel", "Statistics", "Business Intelligence"]),
    ("accounting", ["Accounting", "Finance", "Excel"]),
    ("ethical hacking", ["Cybersecurity", "Networking", "Security", "Linux", "Python"]),
    ("penetration test", ["Cybersecurity", "Security", "Networking", "Linux"]),
    ("hacking", ["Cybersecurity", "Security", "Networking", "Linux"]),
    ("marketing", ["Marketing", "Analytics", "Business Intelligence"]),
    ("supply chain", ["Supply Chain", "Logistics", "Excel"]),
    ("healthcare", ["Healthcare Analytics", "Statistics", "Data Analysis"]),
    ("bioinformatics", ["Bioinformatics", "Python", "Statistics", "R"]),
    ("robotics", ["Robotics", "Python", "Machine Learning"]),
    ("iot", ["IoT", "Networking", "Python", "Embedded Systems"]),
    ("embedded", ["Embedded Systems", "C++", "Electronics"]),
    ("game development", ["Game Development", "Unity", "C#"]),
    ("unity", ["Unity", "C#", "Game Development"]),
    ("unreal", ["Unreal Engine", "C++", "Game Development"]),
]

# Compile patterns once
_COMPILED_TITLE_MAP: list[tuple[re.Pattern, list[str]]] = [
    (re.compile(re.escape(kw), re.IGNORECASE), skills)
    for kw, skills in _TITLE_SKILL_MAP
]


def derive_skills_from_title(title: str, organization: str = "") -> list[str]:
    """Derive relevant skills from course title (and optionally organization) using keyword mapping."""
    combined = f"{title} {organization}"
    found: dict[str, None] = {}  # ordered set

    for pattern, skills in _COMPILED_TITLE_MAP:
        if pattern.search(combined):
            for skill in skills:
                found[skill] = None

    # Fallback: extract from the known SKILL_KEYWORDS list
    if not found:
        extracted = extract_skills_from_text(combined)
        for s in extracted:
            found[s] = None

    return list(found.keys())[:12]


SKILL_KEYWORDS = [
    "Python", "R", "SQL", "Java", "JavaScript", "TypeScript", "C++", "Scala", "Go",
    "Machine Learning", "Deep Learning", "NLP", "Computer Vision", "Statistics",
    "Data Science", "Data Analysis", "Data Engineering", "Data Visualization",
    "TensorFlow", "PyTorch", "Keras", "Scikit-learn", "Pandas", "NumPy",
    "Spark", "Hadoop", "Kafka", "Airflow", "dbt",
    "AWS", "Azure", "GCP", "Cloud Computing", "Docker", "Kubernetes",
    "React", "Node.js", "HTML", "CSS", "REST APIs", "GraphQL",
    "Git", "Linux", "Bash", "Terraform", "Ansible",
    "Tableau", "Power BI", "Excel", "Business Intelligence",
    "MLOps", "DevOps", "CI/CD", "Agile", "Project Management",
    "Neural Networks", "BERT", "Transformers", "OpenAI", "LLMs",
    "Reinforcement Learning", "Feature Engineering", "A/B Testing",
    "PostgreSQL", "MongoDB", "Redis", "Elasticsearch",
    "Generative AI", "Prompt Engineering", "ChatGPT",
    "Cybersecurity", "Networking", "Security",
    "Blockchain", "Algorithms", "Data Structures",
    "Finance", "Accounting", "Leadership",
]

_SKILL_LOWER = {s.lower(): s for s in SKILL_KEYWORDS}


def extract_skills_from_text(text: str) -> list[str]:
    text_lower = text.lower()
    found = []
    for lower_skill, original in _SKILL_LOWER.items():
        pattern = r"\b" + re.escape(lower_skill) + r"\b"
        if re.search(pattern, text_lower):
            found.append(original)
    return list(dict.fromkeys(found))


def parse_difficulty(text: str) -> str:
    if not text:
        return "Mixed"
    t = text.lower().strip()
    if "begin" in t or "intro" in t or "basic" in t or "easy" in t or "level 1" in t or "novice" in t:
        return "Beginner"
    if "inter" in t or "medium" in t or "level 2" in t:
        return "Intermediate"
    if "adv" in t or "expert" in t or "hard" in t or "level 3" in t:
        return "Advanced"
    return "Mixed"


def parse_rating(val) -> float:
    try:
        r = float(str(val).strip())
        return round(max(0.0, min(5.0, r)), 1)
    except (ValueError, TypeError):
        return 4.0


def parse_skills_list(skills_str: str) -> list[str]:
    if not skills_str:
        return []
    delimiters = r"[|,;\n]"
    parts = re.split(delimiters, str(skills_str))
    return [p.strip() for p in parts if p.strip() and len(p.strip()) > 1]
