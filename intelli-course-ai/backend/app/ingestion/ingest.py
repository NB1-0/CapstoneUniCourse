import uuid
from pathlib import Path

import structlog

from app.ingestion.text_cleaner import clean_text, parse_difficulty, parse_rating, parse_skills_list, extract_skills_from_text
from app.models.course import Course

logger = structlog.get_logger()

SAMPLE_COURSES: list[dict] = [
    {"course_name": "Machine Learning Specialization", "organization": "Stanford / DeepLearning.AI", "description": "Learn fundamental AI and ML concepts including supervised learning, unsupervised learning, and best practices. Covers linear regression, logistic regression, neural networks, decision trees, and recommender systems.", "skills": ["Machine Learning", "Python", "NumPy", "Scikit-learn", "TensorFlow", "Statistics"], "difficulty_level": "Beginner", "rating": 4.9},
    {"course_name": "Deep Learning Specialization", "organization": "DeepLearning.AI", "description": "Master deep learning fundamentals including neural networks, CNN, RNN, LSTM, transformers, and NLP. Build AI applications using TensorFlow and Keras.", "skills": ["Deep Learning", "TensorFlow", "Neural Networks", "CNNs", "RNNs", "Python"], "difficulty_level": "Intermediate", "rating": 4.9},
    {"course_name": "IBM Data Science Professional Certificate", "organization": "IBM", "description": "Kickstart your data science career with Python, SQL, data visualization, machine learning, and real-world data projects on IBM Cloud.", "skills": ["Python", "SQL", "Data Science", "Data Visualization", "Machine Learning", "Jupyter"], "difficulty_level": "Beginner", "rating": 4.6},
    {"course_name": "Google Data Analytics Certificate", "organization": "Google", "description": "Learn how to collect, transform, and organize data to draw conclusions, make predictions, and drive informed decision-making using SQL, R, and Tableau.", "skills": ["SQL", "R", "Data Analysis", "Tableau", "Data Visualization", "Excel"], "difficulty_level": "Beginner", "rating": 4.8},
    {"course_name": "AWS Cloud Practitioner Essentials", "organization": "Amazon Web Services", "description": "Build foundational knowledge of AWS cloud concepts, AWS services, security, architecture, pricing, and support. Prepare for the AWS Cloud Practitioner exam.", "skills": ["AWS", "Cloud Computing", "Cloud Architecture", "Security", "Networking"], "difficulty_level": "Beginner", "rating": 4.7},
    {"course_name": "TensorFlow Developer Professional Certificate", "organization": "DeepLearning.AI", "description": "Learn to build and train neural networks using TensorFlow, implement image recognition, NLP, and time series forecasting with deep learning.", "skills": ["TensorFlow", "Deep Learning", "Python", "Computer Vision", "NLP", "Neural Networks"], "difficulty_level": "Intermediate", "rating": 4.7},
    {"course_name": "Natural Language Processing Specialization", "organization": "DeepLearning.AI", "description": "Build NLP models with attention mechanisms, transformers, BERT, and GPT. Tackle sentiment analysis, machine translation, and question answering.", "skills": ["NLP", "Python", "TensorFlow", "BERT", "Transformers", "Deep Learning"], "difficulty_level": "Advanced", "rating": 4.8},
    {"course_name": "Applied Data Science with Python", "organization": "University of Michigan", "description": "5-course specialization covering data manipulation, machine learning, text mining, and social network analysis using Python tools.", "skills": ["Python", "Pandas", "Scikit-learn", "Matplotlib", "Data Science", "Statistics"], "difficulty_level": "Intermediate", "rating": 4.5},
    {"course_name": "IBM Data Engineering Professional Certificate", "organization": "IBM", "description": "Build job-ready skills for a data engineering career. Learn Python, SQL, NoSQL, big data, Spark, ETL, and data warehousing on the cloud.", "skills": ["Python", "SQL", "Apache Spark", "NoSQL", "ETL", "Data Engineering", "IBM Cloud"], "difficulty_level": "Intermediate", "rating": 4.6},
    {"course_name": "Google Cloud Professional Data Engineer", "organization": "Google Cloud", "description": "Design, build, operationalize, and secure data processing systems using Google Cloud Platform tools including BigQuery, Dataflow, and Pub/Sub.", "skills": ["GCP", "BigQuery", "Dataflow", "Data Engineering", "Cloud Computing", "Python"], "difficulty_level": "Advanced", "rating": 4.7},
    {"course_name": "Meta Front-End Developer Certificate", "organization": "Meta", "description": "Launch a career as a front-end developer. Build dynamic web pages using HTML, CSS, JavaScript, and React. Create accessible, responsive user interfaces.", "skills": ["HTML", "CSS", "JavaScript", "React", "Node.js", "REST APIs"], "difficulty_level": "Beginner", "rating": 4.7},
    {"course_name": "Full Stack Web Development with React", "organization": "Hong Kong University of Science and Technology", "description": "Learn Bootstrap, React, Angular, Node.js, Express.js, and MongoDB to build complete full-stack web applications.", "skills": ["React", "Node.js", "JavaScript", "MongoDB", "Express.js", "REST APIs"], "difficulty_level": "Intermediate", "rating": 4.5},
    {"course_name": "Python for Everybody Specialization", "organization": "University of Michigan", "description": "Learn to program and analyze data with Python. Develop programs, collect, clean, visualize, and analyze data using Python libraries.", "skills": ["Python", "SQL", "Data Analysis", "Web Scraping", "JSON", "APIs"], "difficulty_level": "Beginner", "rating": 4.8},
    {"course_name": "SQL for Data Science", "organization": "UC Davis", "description": "Assume the role of a data scientist and learn how to read and write intermediate-level SQL queries using the SELECT statement.", "skills": ["SQL", "Data Analysis", "Database Management", "SQLite", "Data Filtering"], "difficulty_level": "Beginner", "rating": 4.6},
    {"course_name": "Statistics with Python Specialization", "organization": "University of Michigan", "description": "Learn statistical analysis techniques using Python including probability, hypothesis testing, confidence intervals, and regression analysis.", "skills": ["Python", "Statistics", "Pandas", "Scipy", "Data Analysis", "Hypothesis Testing"], "difficulty_level": "Intermediate", "rating": 4.5},
    {"course_name": "MLOps Specialization", "organization": "DeepLearning.AI", "description": "Become an ML Engineer. Learn to build, deploy, and maintain production ML systems including feature engineering, model training pipelines, and monitoring.", "skills": ["MLOps", "Python", "TensorFlow", "Docker", "Kubernetes", "ML Pipelines"], "difficulty_level": "Advanced", "rating": 4.7},
    {"course_name": "Docker and Kubernetes: The Complete Guide", "organization": "Udemy / Stephen Grider", "description": "Build production-grade web applications and deploy them using Docker and Kubernetes. Learn container orchestration from scratch.", "skills": ["Docker", "Kubernetes", "DevOps", "CI/CD", "Node.js", "AWS"], "difficulty_level": "Intermediate", "rating": 4.8},
    {"course_name": "Microsoft Azure Fundamentals AZ-900", "organization": "Microsoft", "description": "Demonstrate foundational knowledge of cloud concepts and Azure services, security, privacy, compliance, and trust.", "skills": ["Azure", "Cloud Computing", "Security", "Networking", "Cloud Architecture"], "difficulty_level": "Beginner", "rating": 4.7},
    {"course_name": "Computer Vision with TensorFlow", "organization": "DeepLearning.AI", "description": "Build computer vision applications using CNNs, object detection, segmentation, and transfer learning with TensorFlow and Keras.", "skills": ["Computer Vision", "TensorFlow", "CNNs", "Object Detection", "Python", "Deep Learning"], "difficulty_level": "Intermediate", "rating": 4.6},
    {"course_name": "Reinforcement Learning Specialization", "organization": "University of Alberta", "description": "Master RL algorithms including Q-learning, policy gradients, actor-critic, and apply them to complex decision-making problems.", "skills": ["Reinforcement Learning", "Python", "Machine Learning", "Neural Networks", "OpenAI Gym"], "difficulty_level": "Advanced", "rating": 4.6},
    {"course_name": "Business Analytics Specialization", "organization": "University of Pennsylvania (Wharton)", "description": "Learn how to apply data analytics to real business problems including customer analytics, people analytics, and accounting analytics.", "skills": ["Business Intelligence", "Data Analysis", "Excel", "Tableau", "Statistics", "SQL"], "difficulty_level": "Beginner", "rating": 4.6},
    {"course_name": "Apache Spark and Scala", "organization": "Databricks", "description": "Master Apache Spark using Scala for large-scale distributed data processing, streaming, machine learning pipelines, and graph processing.", "skills": ["Apache Spark", "Scala", "Big Data", "Data Engineering", "MLlib", "Databricks"], "difficulty_level": "Advanced", "rating": 4.7},
    {"course_name": "Generative AI with Large Language Models", "organization": "DeepLearning.AI / AWS", "description": "Understand the fundamentals of generative AI and how to deploy LLM-based applications. Learn fine-tuning, RLHF, and prompt engineering.", "skills": ["LLMs", "Python", "Generative AI", "Transformers", "Fine-tuning", "AWS"], "difficulty_level": "Intermediate", "rating": 4.8},
    {"course_name": "Data Warehousing and BI Analytics", "organization": "UC Boulder", "description": "Design and implement data warehouses, build ETL pipelines, and create business intelligence dashboards using Tableau and Power BI.", "skills": ["Data Warehousing", "ETL", "SQL", "Tableau", "Power BI", "Business Intelligence"], "difficulty_level": "Intermediate", "rating": 4.5},
    {"course_name": "Agile Project Management", "organization": "Google", "description": "Learn Agile project management methodology, Scrum framework, Kanban, sprint planning, and stakeholder communication.", "skills": ["Agile", "Scrum", "Project Management", "Kanban", "Leadership", "Communication"], "difficulty_level": "Beginner", "rating": 4.8},
    {"course_name": "Fundamentals of Data Engineering", "organization": "O'Reilly / Coursera", "description": "Learn the data engineering lifecycle: source systems, ingestion, transformation, storage, and serving. Covers Kafka, Spark, dbt, and modern data stacks.", "skills": ["Data Engineering", "Kafka", "Apache Spark", "dbt", "SQL", "Airflow"], "difficulty_level": "Intermediate", "rating": 4.6},
    {"course_name": "Prompt Engineering for ChatGPT", "organization": "Vanderbilt University", "description": "Learn how to effectively craft prompts for large language models including ChatGPT and GPT-4 for various use cases.", "skills": ["Prompt Engineering", "LLMs", "ChatGPT", "Generative AI", "Python"], "difficulty_level": "Beginner", "rating": 4.7},
    {"course_name": "Advanced Machine Learning Specialization", "organization": "HSE University", "description": "Deep dive into competitive machine learning, Bayesian methods, deep NLP, deep learning in computer vision, and RL.", "skills": ["Machine Learning", "Bayesian Statistics", "Deep Learning", "NLP", "Computer Vision", "Python"], "difficulty_level": "Advanced", "rating": 4.5},
    {"course_name": "Tableau Business Intelligence Analyst", "organization": "Tableau / Salesforce", "description": "Master Tableau for data visualization and business intelligence. Build interactive dashboards and present data-driven insights.", "skills": ["Tableau", "Data Visualization", "Business Intelligence", "SQL", "Data Analysis"], "difficulty_level": "Intermediate", "rating": 4.7},
    {"course_name": "Introduction to Cybersecurity", "organization": "Cisco Networking Academy", "description": "Learn the basics of cybersecurity including common threats, vulnerability types, network security, and cryptography fundamentals.", "skills": ["Cybersecurity", "Networking", "Security", "Linux", "Python", "Risk Assessment"], "difficulty_level": "Beginner", "rating": 4.6},
]


def _build_course(row: dict) -> Course:
    skills_raw = row.get("skills", [])
    if isinstance(skills_raw, str):
        skills = parse_skills_list(skills_raw)
    else:
        skills = [s.strip() for s in skills_raw if s.strip()]

    if not skills:
        skills = extract_skills_from_text(row.get("description", ""))

    return Course(
        id=str(uuid.uuid4()),
        course_name=clean_text(row.get("course_name", "Untitled Course")),
        organization=clean_text(row.get("organization", "Unknown")),
        description=clean_text(row.get("description", "")),
        skills=skills[:15],
        difficulty_level=parse_difficulty(str(row.get("difficulty_level", "Mixed"))),
        rating=parse_rating(row.get("rating", 4.0)),
        course_url=str(row.get("course_url", "")),
        prerequisites=parse_skills_list(str(row.get("prerequisites", ""))),
    )


async def load_sample_data() -> int:
    from app.services.search_service import get_search_service
    courses = [_build_course(r) for r in SAMPLE_COURSES]
    svc = get_search_service()
    await svc.load_courses(courses)
    logger.info("Sample data loaded", count=len(courses))
    return len(courses)


async def ingest_courses(file_path: str = "data/courses.csv") -> int:
    path = Path(file_path)
    if not path.exists():
        logger.warning("File not found, loading sample data", path=str(path))
        return await load_sample_data()

    rows: list[dict] = []
    if path.suffix.lower() == ".csv":
        import pandas as pd
        df = pd.read_csv(path, on_bad_lines="skip")
        df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]
        rows = df.to_dict(orient="records")
    elif path.suffix.lower() == ".json":
        import json
        with open(path, "r", encoding="utf-8") as f:
            rows = json.load(f)
    else:
        raise ValueError(f"Unsupported file format: {path.suffix}")

    courses = []
    for row in rows:
        try:
            courses.append(_build_course(row))
        except Exception as e:
            logger.warning("Skipping malformed row", error=str(e))

    if not courses:
        return await load_sample_data()

    from app.services.search_service import get_search_service
    svc = get_search_service()
    await svc.load_courses(courses)
    logger.info("CSV/JSON data ingested", count=len(courses), source=str(path))
    return len(courses)
