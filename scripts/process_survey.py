import re
import json

# Ruta al archivo de texto extraído
txt_path = "files/encuesta_version.txt"
# Ruta al archivo JSON de salida
json_path = "files/encuesta_version.json"

# Función para procesar el texto y estructurarlo en secciones y preguntas
def process_survey_text(txt_path):
    with open(txt_path, "r", encoding="utf-8") as file:
        lines = file.readlines()

    survey_structure = {}
    current_section = None
    current_subsection = None

    for line in lines:
        line = line.strip()

        # Detectar secciones principales (e.g., 1., 2., 3.)
        section_match = re.match(r"^(\d+)\.\s+(.*)", line)
        if section_match and not re.match(r"^(\d+\.\d+)\.\s+", line):
            section_number = section_match.group(1)
            section_title = section_match.group(2)
            current_section = section_number
            current_subsection = None
            survey_structure[current_section] = {
                "title": section_title,
                "subsections": {},
                "questions": []
            }
            continue

        # Detectar subsecciones (e.g., 1.1, 2.1)
        subsection_match = re.match(r"^(\d+\.\d+)\.\s+(.*)", line)
        if subsection_match:
            subsection_number = subsection_match.group(1)
            subsection_title = subsection_match.group(2)
            current_subsection = subsection_number
            if current_section:
                survey_structure[current_section]["subsections"][current_subsection] = {
                    "title": subsection_title,
                    "questions": []
                }
            continue

        # Detectar preguntas (e.g., 22. ¿Por qué no se realizaron pruebas confirmatorias?*)
        question_match = re.match(r"^(\d+)\.\s+(.*)", line)
        if question_match:
            question_number = question_match.group(1)
            question_text = question_match.group(2)
            if current_subsection:
                survey_structure[current_section]["subsections"][current_subsection]["questions"].append({
                    "number": question_number,
                    "text": question_text
                })
            elif current_section:
                survey_structure[current_section]["questions"].append({
                    "number": question_number,
                    "text": question_text
                })

    return survey_structure

# Procesar el texto y guardar el JSON
if __name__ == "__main__":
    survey_data = process_survey_text(txt_path)
    with open(json_path, "w", encoding="utf-8") as json_file:
        json.dump(survey_data, json_file, ensure_ascii=False, indent=4)
    print(f"Encuesta procesada y guardada en: {json_path}")