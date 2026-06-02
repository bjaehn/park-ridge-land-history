from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]


def main() -> None:
    for path in [
        PROJECT_ROOT / "data/raw",
        PROJECT_ROOT / "data/interim",
        PROJECT_ROOT / "data/processed",
        PROJECT_ROOT / "public/data",
        PROJECT_ROOT / "docs",
    ]:
        path.mkdir(parents=True, exist_ok=True)
        print(f"Ready: {path.relative_to(PROJECT_ROOT)}")


if __name__ == "__main__":
    main()
