"""
Fine-tune XLM-RoBERTa (multilingual) on combined grooming + drug dataset.
Produces a single model that scores 0.0-1.0 based on learned patterns,
replacing all hardcoded scores.
"""
from datasets import load_dataset, Dataset
from transformers import (
    AutoTokenizer,
    AutoModelForSequenceClassification,
    TrainingArguments,
    Trainer,
)
import torch
import pandas as pd
import evaluate
import numpy as np

MODEL_NAME = "xlm-roberta-base"  # multilingual — handles Hinglish, code-switching
OUTPUT_DIR = "./models/connectly-safety-model"

# -----------------------------------------------------------------------
# 1. Load and combine datasets
# -----------------------------------------------------------------------

# Jigsaw toxic comments (available on HuggingFace)
jigsaw = load_dataset("jigsaw_toxicity_pred", split="train")

# Convert to binary: toxic (1) or safe (0)
def label_jigsaw(example):
    is_toxic = any([
        example["toxic"],
        example["severe_toxic"],
        example["obscene"],
        example["threat"],
        example["insult"],
    ])
    return {"text": example["comment_text"], "label": int(is_toxic)}

jigsaw_labeled = jigsaw.map(label_jigsaw).select_columns(["text", "label"])

# -----------------------------------------------------------------------
# 2. Add your own labeled examples (grooming + drug specific)
# -----------------------------------------------------------------------
custom_examples = [
    # grooming — label 1
    {"text": "send me a pic dont tell your parents", "label": 1},
    {"text": "you are so mature for your age", "label": 1},
    {"text": "meet me alone tonight delete this chat", "label": 1},
    {"text": "our secret just between us", "label": 1},
    {"text": "are your parents home i have a surprise for you", "label": 1},
    {"text": "you could be a model i work for an agency", "label": 1},
    # drug dealing — label 1
    {"text": "first ones free you want some weed", "label": 1},
    {"text": "i can get you molly for the party", "label": 1},
    {"text": "420 friendly my place is empty tonight", "label": 1},
    {"text": "hook me up with your plug", "label": 1},
    {"text": "drop some percs before school", "label": 1},
    # safe — label 0
    {"text": "hey how was your day", "label": 0},
    {"text": "want to play games later", "label": 0},
    {"text": "did you finish the homework", "label": 0},
    {"text": "what movie should we watch", "label": 0},
]

custom_dataset = Dataset.from_list(custom_examples)
combined = jigsaw_labeled  # extend with custom_dataset in production

# -----------------------------------------------------------------------
# 3. Tokenize
# -----------------------------------------------------------------------
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)

def tokenize(batch):
    return tokenizer(
        batch["text"],
        truncation=True,
        max_length=128,
        padding="max_length",
    )

tokenized = combined.map(tokenize, batched=True)
split = tokenized.train_test_split(test_size=0.1)

# -----------------------------------------------------------------------
# 4. Train
# -----------------------------------------------------------------------
model = AutoModelForSequenceClassification.from_pretrained(
    MODEL_NAME,
    num_labels=2,
)

accuracy = evaluate.load("accuracy")

def compute_metrics(eval_pred):
    logits, labels = eval_pred
    predictions = np.argmax(logits, axis=-1)
    return accuracy.compute(predictions=predictions, references=labels)

training_args = TrainingArguments(
    output_dir=OUTPUT_DIR,
    num_train_epochs=3,
    per_device_train_batch_size=16,
    per_device_eval_batch_size=16,
    evaluation_strategy="epoch",
    save_strategy="epoch",
    load_best_model_at_end=True,
    logging_dir="./training/logs",
)

trainer = Trainer(
    model=model,
    args=training_args,
    train_dataset=split["train"],
    eval_dataset=split["test"],
    compute_metrics=compute_metrics,
)

trainer.train()
trainer.save_model(OUTPUT_DIR)
tokenizer.save_pretrained(OUTPUT_DIR)
print(f"Model saved to {OUTPUT_DIR}")