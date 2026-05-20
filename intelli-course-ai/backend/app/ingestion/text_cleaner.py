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


SKILL_KEYWORDS = [
    "Python", "R", "SQL", "Java", "JavaScript", "TypeScript", "C++", "Scala",
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
    if "begin" in t or "intro" in t or "basic" in t or "easy" in t or "level 1" in t:
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
