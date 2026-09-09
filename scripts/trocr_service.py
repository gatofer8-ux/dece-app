#!/usr/bin/env python3
"""
Servicio local de OCR para texto manuscrito (TrOCR de Microsoft)
Ejecuta el modelo localmente sin conexión a APIs externas ni costes.
"""

import sys
import os
import json
import argparse

def check_dependencies():
    try:
        import torch
        import transformers
        from PIL import Image
        return True, None
    except ImportError as e:
        return False, str(e)

def run_trocr(image_path, crops=None):
    is_ok, err = check_dependencies()
    if not is_ok:
        return {
            "available": False,
            "error": f"Dependencias no disponibles en el entorno: {err}",
            "predictions": []
        }

    try:
        import torch
        from PIL import Image
        from transformers import TrOCRProcessor, VisionEncoderDecoderModel

        if not os.path.exists(image_path):
            return {"available": False, "error": f"Archivo no encontrado: {image_path}", "predictions": []}

        # Modelo optimizado para texto manuscrito en CPU
        model_name = "microsoft/trocr-small-handwritten"
        processor = TrOCRProcessor.from_pretrained(model_name)
        model = VisionEncoderDecoderModel.from_pretrained(model_name)
        model.eval()

        image = Image.open(image_path).convert("RGB")
        predictions = []

        if crops and len(crops) > 0:
            for c in crops:
                box = (c.get("x1", 0), c.get("y1", 0), c.get("x2", image.width), c.get("y2", image.height))
                cropped = image.crop(box)
                pixel_values = processor(images=cropped, return_tensors="pt").pixel_values
                with torch.no_grad():
                    generated_ids = model.generate(pixel_values, max_new_tokens=64)
                text = processor.batch_decode(generated_ids, skip_special_tokens=True)[0]
                predictions.append({
                    "crop": c,
                    "text": text.strip(),
                    "source": "trocr_handwritten"
                })
        else:
            pixel_values = processor(images=image, return_tensors="pt").pixel_values
            with torch.no_grad():
                generated_ids = model.generate(pixel_values, max_new_tokens=64)
            text = processor.batch_decode(generated_ids, skip_special_tokens=True)[0]
            predictions.append({
                "crop": None,
                "text": text.strip(),
                "source": "trocr_handwritten"
            })

        return {
            "available": True,
            "predictions": predictions
        }
    except Exception as e:
        return {
            "available": False,
            "error": f"Error durante la inferencia TrOCR: {str(e)}",
            "predictions": []
        }

def main():
    parser = argparse.ArgumentParser(description="Microservicio local de inferencia TrOCR")
    parser.add_argument("--check", action="store_true", help="Verificar disponibilidad de PyTorch y Transformers")
    parser.add_argument("--image", type=str, help="Ruta a la imagen para extraer")
    parser.add_argument("--json", type=str, help="Cadena JSON de configuración")

    args = parser.parse_args()

    if args.check:
        ok, err = check_dependencies()
        print(json.dumps({"available": ok, "error": err}))
        return

    if args.json:
        try:
            data = json.loads(args.json)
            result = run_trocr(data.get("image_path"), data.get("crops"))
            print(json.dumps(result))
            return
        except Exception as e:
            print(json.dumps({"available": False, "error": str(e), "predictions": []}))
            return

    if args.image:
        result = run_trocr(args.image)
        print(json.dumps(result))
        return

    # Si se recibe por stdin
    if not sys.stdin.isatty():
        try:
            stdin_data = sys.stdin.read().strip()
            if stdin_data:
                data = json.loads(stdin_data)
                result = run_trocr(data.get("image_path"), data.get("crops"))
                print(json.dumps(result))
                return
        except Exception as e:
            print(json.dumps({"available": False, "error": str(e), "predictions": []}))
            return

    print(json.dumps({"available": False, "error": "Parámetros insuficientes", "predictions": []}))

if __name__ == "__main__":
    main()
