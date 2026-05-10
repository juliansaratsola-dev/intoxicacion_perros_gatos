import pdfplumber

# Ruta al archivo PDF
pdf_path = "files/encuesta_version.pdf"

# Función para extraer texto del PDF
def extract_text_from_pdf(pdf_path):
    try:
        with pdfplumber.open(pdf_path) as pdf:
            text = ""
            for page in pdf.pages:
                text += page.extract_text() + "\n"
            return text
    except Exception as e:
        print(f"Error al procesar el PDF: {e}")
        return None

# Extraer texto del PDF
if __name__ == "__main__":
    extracted_text = extract_text_from_pdf(pdf_path)
    if extracted_text:
        output_path = "files/encuesta_version.txt"
        with open(output_path, "w", encoding="utf-8") as output_file:
            output_file.write(extracted_text)
        print(f"Texto extraído y guardado en: {output_path}")
    else:
        print("No se pudo extraer el texto del PDF.")