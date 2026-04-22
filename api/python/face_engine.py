#!/usr/bin/env python3
import io
import json
import sys


def main() -> int:
    try:
        import face_recognition  # type: ignore
    except Exception as exc:
        sys.stdout.write(json.dumps({"error": f"face_recognition import failed: {exc}"}))
        sys.stdout.flush()
        return 1

    data = sys.stdin.buffer.read()
    if not data:
        sys.stdout.write(json.dumps({"error": "empty image bytes"}))
        sys.stdout.flush()
        return 1

    try:
        image = face_recognition.load_image_file(io.BytesIO(data))
        encodings = face_recognition.face_encodings(image)
        if not encodings:
            sys.stdout.write(json.dumps({"error": "no face detected"}))
            sys.stdout.flush()
            return 1
        embedding = encodings[0].tolist()
        sys.stdout.write(json.dumps({"embedding": embedding}))
        sys.stdout.flush()
        return 0
    except Exception as exc:
        sys.stdout.write(json.dumps({"error": f"embedding extraction failed: {exc}"}))
        sys.stdout.flush()
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
