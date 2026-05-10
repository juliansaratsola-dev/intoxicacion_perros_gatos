CREATE TABLE surveys (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL
);

CREATE TABLE questions (
    id SERIAL PRIMARY KEY,
    survey_id INTEGER REFERENCES surveys(id),
    text TEXT NOT NULL,
    type TEXT NOT NULL
);

CREATE TABLE responses (
    id SERIAL PRIMARY KEY,
    survey_id INTEGER REFERENCES surveys(id),
    question_id INTEGER REFERENCES questions(id),
    response TEXT NOT NULL
);