"""
Graph schema constants — node types, relationship types, and domain knowledge maps.
All knowledge about skill progressions, career requirements, and domain groupings lives here.
"""

from enum import Enum


class NodeType(str, Enum):
    COURSE = "Course"
    SKILL = "Skill"
    CAREER = "Career"
    DOMAIN = "Domain"
    LEARNING_LEVEL = "LearningLevel"


class RelType(str, Enum):
    TEACHES = "TEACHES"
    REQUIRES = "REQUIRES"
    LEADS_TO = "LEADS_TO"
    RELATED_TO = "RELATED_TO"
    ADVANCES_TO = "ADVANCES_TO"
    BELONGS_TO = "BELONGS_TO"


# Skill → Domain mapping
SKILL_DOMAINS: dict[str, str] = {
    # AI / ML
    "Machine Learning": "Artificial Intelligence",
    "Deep Learning": "Artificial Intelligence",
    "NLP": "Artificial Intelligence",
    "Computer Vision": "Artificial Intelligence",
    "Reinforcement Learning": "Artificial Intelligence",
    "Generative AI": "Artificial Intelligence",
    "LLMs": "Artificial Intelligence",
    "Transformers": "Artificial Intelligence",
    "BERT": "Artificial Intelligence",
    "Neural Networks": "Artificial Intelligence",
    "Feature Engineering": "Artificial Intelligence",
    "MLOps": "Artificial Intelligence",
    "Fine-tuning": "Artificial Intelligence",
    "Prompt Engineering": "Artificial Intelligence",
    "ChatGPT": "Artificial Intelligence",
    # Data Science
    "Data Science": "Data Science",
    "Statistics": "Data Science",
    "Data Analysis": "Data Science",
    "Data Visualization": "Data Science",
    "Pandas": "Data Science",
    "NumPy": "Data Science",
    "Scikit-learn": "Data Science",
    "Matplotlib": "Data Science",
    "R": "Data Science",
    "Hypothesis Testing": "Data Science",
    "Bayesian Statistics": "Data Science",
    "A/B Testing": "Data Science",
    # Data Engineering
    "Data Engineering": "Data Engineering",
    "Apache Spark": "Data Engineering",
    "Airflow": "Data Engineering",
    "Kafka": "Data Engineering",
    "ETL": "Data Engineering",
    "dbt": "Data Engineering",
    "Data Warehousing": "Data Engineering",
    "BigQuery": "Data Engineering",
    "Dataflow": "Data Engineering",
    "NoSQL": "Data Engineering",
    # Cloud
    "Cloud Computing": "Cloud & DevOps",
    "AWS": "Cloud & DevOps",
    "Azure": "Cloud & DevOps",
    "GCP": "Cloud & DevOps",
    "Cloud Architecture": "Cloud & DevOps",
    "Docker": "Cloud & DevOps",
    "Kubernetes": "Cloud & DevOps",
    "DevOps": "Cloud & DevOps",
    "CI/CD": "Cloud & DevOps",
    "Terraform": "Cloud & DevOps",
    "Ansible": "Cloud & DevOps",
    "Linux": "Cloud & DevOps",
    # Programming
    "Python": "Programming",
    "SQL": "Programming",
    "JavaScript": "Programming",
    "TypeScript": "Programming",
    "Java": "Programming",
    "Scala": "Programming",
    "Go": "Programming",
    "C++": "Programming",
    "Bash": "Programming",
    # Web Dev
    "React": "Web Development",
    "Node.js": "Web Development",
    "HTML": "Web Development",
    "CSS": "Web Development",
    "REST APIs": "Web Development",
    "GraphQL": "Web Development",
    "MongoDB": "Web Development",
    # Frameworks / Tools
    "TensorFlow": "AI Frameworks",
    "PyTorch": "AI Frameworks",
    "Keras": "AI Frameworks",
    # BI
    "Tableau": "Business Intelligence",
    "Power BI": "Business Intelligence",
    "Excel": "Business Intelligence",
    "Business Intelligence": "Business Intelligence",
    # Security
    "Cybersecurity": "Security",
    "Networking": "Security",
    "Security": "Security",
    # PM
    "Agile": "Project Management",
    "Scrum": "Project Management",
    "Project Management": "Project Management",
    "Leadership": "Project Management",
    # DB
    "PostgreSQL": "Databases",
    "Redis": "Databases",
    "Elasticsearch": "Databases",
}

# Directed skill progression paths (from → to, ADVANCES_TO relationship)
SKILL_PROGRESSIONS: list[tuple[str, str]] = [
    ("Python", "Data Analysis"),
    ("Python", "Machine Learning"),
    ("Python", "Data Engineering"),
    ("Python", "Web Development"),
    ("Statistics", "Machine Learning"),
    ("Statistics", "Data Analysis"),
    ("Data Analysis", "Machine Learning"),
    ("Data Analysis", "Data Visualization"),
    ("Data Analysis", "Data Warehousing"),
    ("Machine Learning", "Deep Learning"),
    ("Machine Learning", "MLOps"),
    ("Machine Learning", "Reinforcement Learning"),
    ("Machine Learning", "Feature Engineering"),
    ("Deep Learning", "NLP"),
    ("Deep Learning", "Computer Vision"),
    ("Deep Learning", "Generative AI"),
    ("NLP", "LLMs"),
    ("NLP", "Transformers"),
    ("LLMs", "Fine-tuning"),
    ("LLMs", "Prompt Engineering"),
    ("Transformers", "BERT"),
    ("SQL", "Data Engineering"),
    ("SQL", "Data Warehousing"),
    ("SQL", "Data Analysis"),
    ("Apache Spark", "Data Engineering"),
    ("Data Engineering", "Apache Spark"),
    ("Data Engineering", "Kafka"),
    ("Data Engineering", "Airflow"),
    ("HTML", "CSS"),
    ("CSS", "JavaScript"),
    ("JavaScript", "TypeScript"),
    ("JavaScript", "React"),
    ("JavaScript", "Node.js"),
    ("React", "TypeScript"),
    ("Node.js", "REST APIs"),
    ("Cloud Computing", "AWS"),
    ("Cloud Computing", "Azure"),
    ("Cloud Computing", "GCP"),
    ("Docker", "Kubernetes"),
    ("Kubernetes", "MLOps"),
    ("Linux", "Docker"),
    ("Linux", "DevOps"),
    ("DevOps", "CI/CD"),
    ("DevOps", "Kubernetes"),
    ("TensorFlow", "Deep Learning"),
    ("PyTorch", "Deep Learning"),
    ("Scikit-learn", "Machine Learning"),
]

# Bidirectional related skills (RELATED_TO relationship)
RELATED_SKILLS: list[tuple[str, str]] = [
    ("TensorFlow", "PyTorch"),
    ("TensorFlow", "Keras"),
    ("AWS", "Azure"),
    ("AWS", "GCP"),
    ("Azure", "GCP"),
    ("SQL", "NoSQL"),
    ("PostgreSQL", "SQL"),
    ("MongoDB", "NoSQL"),
    ("Docker", "Kubernetes"),
    ("Agile", "Scrum"),
    ("Tableau", "Power BI"),
    ("React", "Angular"),
    ("NLP", "Computer Vision"),
    ("Machine Learning", "Statistics"),
    ("Data Science", "Machine Learning"),
    ("MLOps", "DevOps"),
    ("Airflow", "dbt"),
    ("BigQuery", "Apache Spark"),
    ("LLMs", "Generative AI"),
    ("BERT", "Transformers"),
    ("Prompt Engineering", "LLMs"),
    ("Python", "R"),
    ("Pandas", "NumPy"),
    ("Data Warehousing", "ETL"),
    ("Kafka", "Airflow"),
]

# Career → required skills mapping
CAREER_SKILLS: dict[str, list[str]] = {
    "Data Scientist": [
        "Python", "Machine Learning", "Statistics", "SQL",
        "Data Visualization", "Deep Learning", "Scikit-learn", "Pandas",
    ],
    "Machine Learning Engineer": [
        "Python", "Machine Learning", "Deep Learning", "MLOps",
        "Docker", "Kubernetes", "TensorFlow", "Feature Engineering",
    ],
    "Data Engineer": [
        "Python", "SQL", "Apache Spark", "Airflow",
        "Data Engineering", "Kafka", "Cloud Computing", "ETL",
    ],
    "NLP Engineer": [
        "Python", "NLP", "Transformers", "BERT",
        "Deep Learning", "TensorFlow", "LLMs",
    ],
    "Computer Vision Engineer": [
        "Python", "Computer Vision", "Deep Learning",
        "TensorFlow", "CNNs", "PyTorch",
    ],
    "AI Research Scientist": [
        "Python", "Deep Learning", "Machine Learning", "Statistics",
        "PyTorch", "TensorFlow", "Reinforcement Learning", "Bayesian Statistics",
    ],
    "LLM / GenAI Engineer": [
        "Python", "LLMs", "Generative AI", "Prompt Engineering",
        "Fine-tuning", "Transformers", "Deep Learning",
    ],
    "MLOps Engineer": [
        "Python", "MLOps", "Docker", "Kubernetes",
        "CI/CD", "Machine Learning", "Cloud Computing", "Airflow",
    ],
    "Cloud Architect": [
        "AWS", "Azure", "GCP", "Cloud Architecture",
        "Docker", "Kubernetes", "Networking", "Security",
    ],
    "DevOps Engineer": [
        "Docker", "Kubernetes", "CI/CD", "Linux",
        "Ansible", "Terraform", "Python", "Cloud Computing",
    ],
    "Frontend Developer": [
        "JavaScript", "React", "TypeScript", "HTML",
        "CSS", "REST APIs",
    ],
    "Backend Developer": [
        "Python", "Node.js", "SQL", "REST APIs",
        "Docker", "PostgreSQL", "Redis",
    ],
    "Full Stack Developer": [
        "JavaScript", "React", "Node.js", "SQL",
        "REST APIs", "Docker", "TypeScript",
    ],
    "Data Analyst": [
        "SQL", "Python", "Data Analysis", "Tableau",
        "Excel", "Statistics", "Data Visualization",
    ],
    "Business Intelligence Analyst": [
        "SQL", "Tableau", "Power BI", "Excel",
        "Business Intelligence", "Data Analysis", "Data Warehousing",
    ],
    "Cybersecurity Analyst": [
        "Cybersecurity", "Networking", "Linux", "Security",
        "Python",
    ],
}

# Difficulty → numeric order for BFS traversal
DIFFICULTY_ORDER = {"Beginner": 0, "Mixed": 1, "Intermediate": 2, "Advanced": 3}
