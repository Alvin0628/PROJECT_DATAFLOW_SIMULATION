from download_dataset import download_dataset
from extract_dataset import extract_dataset
from dataset_verify import dataset_verify


def setup():
    print("=" * 50)
    print("DATA SETUP")
    print("=" * 50)

    download_dataset()
    extract_dataset()
    dataset_verify()

    print("=" * 50)
    print("Project Ready to RUN")
    print("=" * 50)

if __name__ == "__main__":
    setup()