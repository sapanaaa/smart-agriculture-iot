# =============================================================
# ml/train_models.py  —  Phase 10: Real-Data ML Pipeline
#
# Trains 4 models, preferring REAL datasets in ml/datasets/ and
# falling back to synthetic generation only where real data is
# insufficient. All generated/fallback CSVs are written to
# ml/datasets/generated/ so they never masquerade as real data.
#
# Models:
#   1. SwiFT (Sparse Weighted Fusion Transformer) — Crop
#        REAL: Crop_recommendation.csv (Kaggle, Nepal crops)
#        + SYNTH for the few Nepal crops missing from the real set
#   2. TTL (FT-Transformer) — Irrigation (5-class, crop-aware)
#        HYBRID: real feature distributions sampled from TARP.csv,
#        rule-based FAO-56 labelling (falls back to fully synthetic)
#   3. TabNet — Soil Fertility (Low/Medium/High)
#        SYNTH: no real moisture-based fertility data available
#   4. TabNet — Fertilizer (5 Nepal fertilizers)
#        SYNTH seeded with real feature ranges from
#        'Fertilizer Prediction.csv' (real but only ~99 rows)
#
# Usage (from backend/ with venv active):
#   set PYTHONIOENCODING=utf-8 && python -X utf8 ml/train_models.py
# =============================================================

import os, sys, glob, warnings, traceback
import numpy as np
import pandas as pd
import joblib
import torch
import torch.nn as nn
from torch.utils.data import DataLoader, TensorDataset
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report
from pytorch_tabnet.tab_model import TabNetClassifier

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from ml.models.swift_crop import SwiFTCropModel
from ml.models.ttl_irrigation import TTLIrrigationModel, make_ttl_config

warnings.filterwarnings("ignore")
torch.manual_seed(42)
np.random.seed(42)

BASE_DIR      = os.path.dirname(os.path.abspath(__file__))
DATASET_DIR   = os.path.join(BASE_DIR, "datasets")
GENERATED_DIR = os.path.join(DATASET_DIR, "generated")
MODELS_DIR    = os.path.join(BASE_DIR, "saved_models")
REPORTS_DIR   = os.path.join(BASE_DIR, "reports")
for d in (DATASET_DIR, GENERATED_DIR, MODELS_DIR, REPORTS_DIR):
    os.makedirs(d, exist_ok=True)

DEVICE = torch.device("cpu")

# 18 Nepal-specific crops (Terai + Mid-hills)
NEPAL_CROPS = [
    "rice", "wheat", "maize", "potato", "mustard", "soybean",
    "jute", "lentil", "chickpea", "blackgram", "mungbean",
    "pigeonpeas", "kidneybeans", "banana", "watermelon",
    "mango", "apple", "orange",
]

# 5 Nepal-available fertilizers
NEPAL_FERTILIZERS = ["Urea", "DAP", "MOP", "NPK 20-20-20", "Compost"]

print("=" * 65)
print("  AgriSense Phase 10 — Real-Data DL Training Pipeline")
print(f"  Device: {DEVICE}  |  PyTorch: {torch.__version__}")
print(f"  Crops: {len(NEPAL_CROPS)}  |  Fertilizers: {len(NEPAL_FERTILIZERS)}")
print("=" * 65)


# ──────────────────────────────────────────────────────────────
# HELPERS
# ──────────────────────────────────────────────────────────────

def clean_saved_models():
    """Remove ALL previously trained artefacts so we start fresh."""
    removed = 0
    for path in glob.glob(os.path.join(MODELS_DIR, "*")):
        if os.path.isfile(path):
            try:
                os.remove(path)
                removed += 1
            except Exception as e:
                print(f"    could not remove {os.path.basename(path)}: {e}")
    print(f"  Cleaned saved_models/  ({removed} old artefacts removed)")


def save(obj, filename):
    path = os.path.join(MODELS_DIR, filename)
    joblib.dump(obj, path)
    print(f"    saved  {filename:<52s}  {os.path.getsize(path)/1024:7.1f} KB")


def save_torch(model, filename):
    path = os.path.join(MODELS_DIR, filename)
    torch.save(model.state_dict(), path)
    print(f"    saved  {filename:<52s}  {os.path.getsize(path)/1024:7.1f} KB")


def load_real_csv(filename):
    """Load a REAL dataset from ml/datasets/ (never from generated/)."""
    path = os.path.join(DATASET_DIR, filename)
    if not os.path.exists(path):
        return None
    df = pd.read_csv(path)
    print(f"  [REAL] Loaded {filename}  ({len(df)} rows)")
    return df


def save_generated(df, filename):
    """Persist a generated/fallback dataset under datasets/generated/."""
    path = os.path.join(GENERATED_DIR, filename)
    df.to_csv(path, index=False)
    print(f"  [SYNTH] Wrote generated/{filename}  ({len(df)} rows)")


def full_report(y_true, y_pred, class_names, title):
    acc = accuracy_score(y_true, y_pred)
    print(f"\n  {title}")
    print(f"    Test Accuracy : {acc*100:.2f}%")
    rep = classification_report(y_true, y_pred, target_names=[str(c) for c in class_names],
                                output_dict=True, zero_division=0)
    wa = rep["weighted avg"]
    ma = rep["macro avg"]
    print(f"    Precision (w) : {wa['precision']*100:.2f}%   (macro {ma['precision']*100:.2f}%)")
    print(f"    Recall    (w) : {wa['recall']*100:.2f}%   (macro {ma['recall']*100:.2f}%)")
    print(f"    F1-score  (w) : {wa['f1-score']*100:.2f}%   (macro {ma['f1-score']*100:.2f}%)")
    report_path = os.path.join(REPORTS_DIR, f"{title.lower().replace(' ', '_')[:40]}.txt")
    with open(report_path, "w", encoding="utf-8") as f:
        f.write(f"{title}\nAccuracy: {acc*100:.2f}%\n\n")
        f.write(classification_report(y_true, y_pred,
                target_names=[str(c) for c in class_names], zero_division=0))
    return acc


def apply_smote(X, y, random_state=42):
    """Apply SMOTE if imbalanced-learn is available, else return unchanged."""
    try:
        from imblearn.over_sampling import SMOTE
        counts = np.bincount(y)
        nz = counts[counts > 0]
        if nz.max() / nz.min() > 1.5:
            sm = SMOTE(random_state=random_state, k_neighbors=min(5, int(nz.min()) - 1))
            X_res, y_res = sm.fit_resample(X, y)
            print(f"    SMOTE: {len(y)} → {len(y_res)} samples (balanced)")
            return X_res, y_res
        return X, y
    except ImportError:
        print("    SMOTE skipped (imbalanced-learn not installed)")
        return X, y
    except Exception as e:
        print(f"    SMOTE skipped: {e}")
        return X, y


def train_pytorch_model(model, X_tr, y_tr, X_val, y_val,
                        epochs=60, lr=1e-3, batch_size=64,
                        x_cat_tr=None, x_cat_val=None, patience=12):
    """Generic PyTorch classification training loop with early stopping."""
    model.to(DEVICE)
    optimizer = torch.optim.Adam(model.parameters(), lr=lr, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, epochs)
    criterion = nn.CrossEntropyLoss()

    uses_cat = x_cat_tr is not None

    Xtr_t = torch.tensor(X_tr, dtype=torch.float32)
    ytr_t = torch.tensor(y_tr, dtype=torch.long)

    if uses_cat:
        cat_tr_t  = torch.tensor(x_cat_tr,  dtype=torch.long)
        cat_val_t = torch.tensor(x_cat_val, dtype=torch.long)
        train_ds  = TensorDataset(Xtr_t, cat_tr_t, ytr_t)
    else:
        train_ds = TensorDataset(Xtr_t, ytr_t)

    loader = DataLoader(train_ds, batch_size=batch_size, shuffle=True)
    Xval_t = torch.tensor(X_val, dtype=torch.float32).to(DEVICE)

    best_val_acc = 0.0
    best_state   = None
    no_improve   = 0

    for epoch in range(1, epochs + 1):
        model.train()
        for batch in loader:
            if uses_cat:
                xb, catb, yb = [t.to(DEVICE) for t in batch]
                logits = model(xb, catb)
            else:
                xb, yb = [t.to(DEVICE) for t in batch]
                logits = model(xb)
            loss = criterion(logits, yb)
            optimizer.zero_grad()
            loss.backward()
            nn.utils.clip_grad_norm_(model.parameters(), 1.0)
            optimizer.step()
        scheduler.step()

        model.eval()
        with torch.no_grad():
            if uses_cat:
                val_logits = model(Xval_t, cat_val_t.to(DEVICE))
            else:
                val_logits = model(Xval_t)
            val_preds = val_logits.argmax(dim=1).cpu().numpy()
        val_acc = accuracy_score(y_val, val_preds)

        if val_acc > best_val_acc:
            best_val_acc = val_acc
            best_state   = {k: v.cpu().clone() for k, v in model.state_dict().items()}
            no_improve   = 0
        else:
            no_improve += 1

        if epoch % 10 == 0:
            print(f"    Epoch {epoch:3d}/{epochs}  val_acc={val_acc*100:.2f}%  "
                  f"best={best_val_acc*100:.2f}%")

        if no_improve >= patience:
            print(f"    Early stop at epoch {epoch}")
            break

    if best_state:
        model.load_state_dict(best_state)
    print(f"    Best validation accuracy: {best_val_acc*100:.2f}%")
    return best_val_acc


# ──────────────────────────────────────────────────────────────
# CROP — Nepal profiles used ONLY for crops missing from real data
# ──────────────────────────────────────────────────────────────

# (N_mean,N_std, P_mean,P_std, K_mean,K_std, T_mean,T_std,
#  H_mean,H_std, pH_mean,pH_std, R_mean,R_std)
_CROP_PROFILES = {
    "rice":        (80, 10, 45,  8, 45,  8, 28, 2, 82, 6, 6.5, 0.4, 210, 30),
    "wheat":       (70,  8, 40,  8, 40,  8, 18, 3, 60, 8, 6.3, 0.3,  80, 15),
    "maize":       (75, 10, 55, 10, 45, 10, 22, 3, 65, 8, 6.2, 0.4, 100, 20),
    "mustard":     (60, 10, 45,  8, 40,  8, 17, 3, 55, 8, 6.5, 0.4,  60, 15),
    "jute":        (78, 10, 46,  8, 40,  8, 28, 2, 80, 6, 6.5, 0.4, 175, 25),
    "lentil":      (18,  5, 68,  8, 19,  5, 16, 3, 64, 8, 6.9, 0.3,  45,  8),
    "chickpea":    (40,  8, 68, 10, 80, 12, 18, 3, 16, 5, 7.0, 0.4,  73, 15),
    "blackgram":   (40,  8, 68,  8, 19,  5, 30, 2, 65, 8, 7.0, 0.3,  67, 12),
    "mungbean":    (20,  5, 48,  8, 20,  5, 28, 2, 85, 8, 6.7, 0.4,  55, 12),
    "pigeonpeas":  (20,  5, 68,  8, 20,  5, 27, 2, 48, 8, 6.0, 0.4, 150, 25),
    "kidneybeans": (20,  5, 67, 10, 20,  5, 20, 3, 21, 5, 5.7, 0.4,  65, 15),
    "soybean":     (40,  8, 55,  8, 35,  8, 25, 2, 70, 8, 6.5, 0.4, 120, 20),
    "banana":      (100,10, 82, 10, 50, 10, 27, 2, 80, 6, 5.5, 0.4, 100, 20),
    "watermelon":  (99, 10, 17,  5, 50, 10, 27, 2, 85, 6, 6.5, 0.4,  50, 12),
    "potato":      (55,  8, 55,  8, 75, 10, 18, 3, 80, 6, 5.5, 0.4, 120, 20),
    "mango":       (20,  5, 27,  5, 30,  5, 31, 2, 50, 8, 5.7, 0.4,  94, 20),
    "apple":       (21,  5,134, 15,199, 20, 13, 3, 92, 6, 5.8, 0.4, 112, 20),
    "orange":      (20,  5, 10,  5, 10,  5, 20, 3, 92, 6, 6.5, 0.4, 110, 20),
}


def synth_crops(crops, n_per_class=200):
    """Generate Nepal-profile samples for a given list of crops."""
    rows = []
    for crop in crops:
        p = _CROP_PROFILES[crop]
        Nm,Ns,Pm,Ps,Km,Ks,Tm,Ts,Hm,Hs,pHm,pHs,Rm,Rs = p
        N  = np.clip(np.random.normal(Nm, Ns, n_per_class), 0, 200)
        P  = np.clip(np.random.normal(Pm, Ps, n_per_class), 0, 150)
        K  = np.clip(np.random.normal(Km, Ks, n_per_class), 0, 250)
        T  = np.clip(np.random.normal(Tm, Ts, n_per_class), 5,  45)
        H  = np.clip(np.random.normal(Hm, Hs, n_per_class), 10, 100)
        pH = np.clip(np.random.normal(pHm,pHs,n_per_class), 3.5, 9.0)
        R  = np.clip(np.random.normal(Rm, Rs, n_per_class), 0, 400)
        for i in range(n_per_class):
            rows.append({"n": round(N[i],2), "p": round(P[i],2), "k": round(K[i],2),
                         "temperature": round(T[i],2), "humidity": round(H[i],2),
                         "ph": round(pH[i],2), "rainfall": round(R[i],2), "label": crop})
    return pd.DataFrame(rows)


# ──────────────────────────────────────────────────────────────
# SOIL FERTILITY — synthetic (no real moisture-based fertility data)
# ──────────────────────────────────────────────────────────────

def generate_soil_fertility_dataset(n=6000):
    """Nepal soil fertility based on NARC agronomic guidelines."""
    rows = []
    for _ in range(n):
        group = np.random.choice(["low", "med", "high"], p=[0.30, 0.40, 0.30])
        if group == "low":
            N    = np.clip(np.random.normal(25, 10),  0, 60)
            P    = np.clip(np.random.normal(12,  6),  0, 30)
            K    = np.clip(np.random.normal(12,  6),  0, 30)
            pH   = np.clip(np.random.normal(5.0, 0.7), 3.5, 6.0)
            mois = np.clip(np.random.normal(25, 10),  5, 45)
            fert = "Low"
        elif group == "high":
            N    = np.clip(np.random.normal(90, 15), 60, 200)
            P    = np.clip(np.random.normal(55, 12), 30, 150)
            K    = np.clip(np.random.normal(55, 12), 30, 150)
            pH   = np.clip(np.random.normal(6.8, 0.5), 6.0, 8.0)
            mois = np.clip(np.random.normal(62, 10), 45, 90)
            fert = "High"
        else:
            N    = np.clip(np.random.normal(52, 12), 30, 80)
            P    = np.clip(np.random.normal(30, 10), 15, 55)
            K    = np.clip(np.random.normal(30, 10), 15, 55)
            pH   = np.clip(np.random.normal(6.3, 0.6), 5.5, 7.5)
            mois = np.clip(np.random.normal(48, 12), 25, 70)
            fert = "Medium"
        rows.append({"N": round(N,2), "P": round(P,2), "K": round(K,2),
                     "pH": round(pH,2), "Moisture": round(mois,2), "Fertility": fert})
    df = pd.DataFrame(rows).sample(frac=1, random_state=42).reset_index(drop=True)
    save_generated(df, "soil_fertility_synth.csv")
    return df


# ──────────────────────────────────────────────────────────────
# IRRIGATION — hybrid: real feature distributions + FAO-56 labels
# ──────────────────────────────────────────────────────────────

CROP_KC   = {"Wheat":1.15, "Rice":1.20, "Maize":1.20, "Potato":1.15,
             "Mustard":1.05, "Vegetables":1.05, "Fruits":0.90,
             "Pulses":1.05, "Soybean":1.10}
STAGES    = ["initial", "development", "mid_season", "late_season"]
STAGE_MOD = {"initial":0.80, "development":1.00, "mid_season":1.15, "late_season":0.85}


def _label_irrigation(sm, depl):
    if   sm >= 65 and depl < 15:   return 0
    elif sm >= 50 or  depl < 30:   return 1
    elif sm >= 35 or  depl < 50:   return 2
    elif sm >= 20 or  depl < 70:   return 3
    else:                          return 4


def _sample_real_irrigation_features(n):
    """Sample (soil_moisture, temp, humidity, ph, rainfall) from TARP.csv."""
    df = load_real_csv("TARP.csv")
    if df is None:
        return None
    df.columns = df.columns.str.strip()
    needed = {"Soil Moisture": "soil_moisture",
              "Air temperature (C)": "temperature",
              "Air humidity (%)": "humidity",
              "ph": "ph",
              "rainfall": "rainfall"}
    if not set(needed).issubset(df.columns):
        print("    TARP.csv missing expected columns, using synthetic features")
        return None
    sub = df[list(needed)].rename(columns=needed).apply(pd.to_numeric, errors="coerce").dropna()
    # clean to physical ranges
    sub = sub[(sub.soil_moisture.between(0, 100)) &
              (sub.temperature.between(0, 50)) &
              (sub.humidity.between(0, 100)) &
              (sub.ph.between(3.0, 10.0)) &
              (sub.rainfall.between(0, 400))]
    if len(sub) < 500:
        return None
    samp = sub.sample(n=n, replace=len(sub) < n, random_state=42).reset_index(drop=True)
    print(f"    Sampled {n} real feature rows from TARP.csv (pool={len(sub)})")
    return samp


def build_irrigation_dataset(n=12000):
    """Build a 5-class crop-aware irrigation dataset.

    Feature distributions come from real TARP.csv where available;
    FAO-56 agronomic features + 5-level labels are computed by rule.
    """
    crop_le  = LabelEncoder().fit(list(CROP_KC.keys()))
    stage_le = LabelEncoder().fit(STAGES)

    real = _sample_real_irrigation_features(n)
    rows = []
    for i in range(n):
        crop  = np.random.choice(list(CROP_KC.keys()))
        stage = np.random.choice(STAGES)
        if real is not None:
            r    = real.iloc[i]
            sm   = float(r.soil_moisture)
            temp = float(r.temperature)
            hum  = float(r.humidity)
            pH   = float(r.ph)
            rain = float(r.rainfall)
        else:
            sm   = float(np.clip(np.random.normal(50, 22),  5,  95))
            temp = float(np.clip(np.random.normal(25,  6),  5,  40))
            hum  = float(np.clip(np.random.normal(65, 15), 10, 100))
            pH   = float(np.clip(np.random.normal(6.5, 0.8), 3.5, 9.0))
            rain = float(np.clip(np.random.exponential(30),  0, 200))

        ET0  = max(0.5, 0.0023 * (temp + 17.8) * (abs(temp - 18) ** 0.5 + 3) * 0.40)
        Kc   = CROP_KC[crop] * STAGE_MOD[stage]
        ETc  = ET0 * Kc
        depl = max(0.0, (100 - sm) + (ETc - rain * 0.75 / 7) * 2.5)
        label = _label_irrigation(sm, depl)

        rows.append({
            "soil_moisture":    round(sm, 2),
            "temperature":      round(temp, 2),
            "humidity":         round(hum, 2),
            "ph":               round(pH, 2),
            "rainfall_mm":      round(rain, 2),
            "ET0":              round(ET0, 3),
            "ETc":              round(ETc, 3),
            "vpd_proxy":        round((1 - hum/100) * temp, 3),
            "depletion":        round(min(depl, 100), 2),
            "crop_type_enc":    int(crop_le.transform([crop])[0]),
            "growth_stage_enc": int(stage_le.transform([stage])[0]),
            "irrigation_label": label,
        })

    df = pd.DataFrame(rows).sample(frac=1, random_state=42).reset_index(drop=True)
    save_generated(df, "irrigation_hybrid.csv")
    counts = df["irrigation_label"].value_counts().sort_index()
    for i in range(5):
        c = int(counts.get(i, 0))
        print(f"    class {i}: {c:5d}  ({c/len(df)*100:.1f}%)")
    return df, crop_le, stage_le


# ──────────────────────────────────────────────────────────────
# FERTILIZER — synthetic seeded with real feature ranges
# ──────────────────────────────────────────────────────────────

FERT_REMAP = {
    "17-17-17": "NPK 20-20-20", "14-35-14": "DAP", "28-28": "Urea",
    "10-26-26": "MOP", "20-20": "NPK 20-20-20",
}


def _load_real_fertilizer():
    """Load the small real fertilizer dataset, remapped to Nepal fertilizers."""
    df = load_real_csv("Fertilizer Prediction.csv")
    if df is None:
        return None
    df.columns = df.columns.str.strip()
    df = df.rename(columns={
        "Temparature": "Temperature", "Soil Type": "Soil_Type",
        "Crop Type": "Crop_Type", "Fertilizer Name": "Fertilizer_Name",
    })
    df["Fertilizer_Name"] = df["Fertilizer_Name"].replace(FERT_REMAP)
    df = df[df["Fertilizer_Name"].isin(NEPAL_FERTILIZERS)]
    keep = ["Temperature", "Humidity", "Moisture", "Soil_Type", "Crop_Type",
            "Nitrogen", "Potassium", "Phosphorous", "Fertilizer_Name"]
    df = df[[c for c in keep if c in df.columns]].dropna()
    if len(df) < 10:
        return None
    return df.reset_index(drop=True)


def generate_fertilizer_dataset(n=10000, real=None):
    """Nepal fertilizer dataset using 5 fertilizers.

    Feature ranges (temp/humidity/moisture means) are seeded from the
    real dataset when available, then a rule maps NPK deficits to a
    Nepal fertilizer. Real rows (if any) are appended verbatim.
    """
    SOIL_TYPES = ["Sandy", "Loamy", "Clay", "Silt", "Alluvial"]
    CROP_TYPES = ["Rice", "Wheat", "Maize", "Potato", "Mustard",
                  "Soybean", "Lentil", "Chickpea", "Vegetables"]

    # Seed environmental ranges from real data where possible
    if real is not None and len(real) >= 10:
        t_m, t_s = float(real.Temperature.mean()), max(2.0, float(real.Temperature.std()))
        h_m, h_s = float(real.Humidity.mean()),    max(3.0, float(real.Humidity.std()))
        m_m, m_s = float(real.Moisture.mean()),    max(3.0, float(real.Moisture.std()))
        print(f"    Seeded fertilizer env ranges from real data "
              f"(T~{t_m:.0f}, H~{h_m:.0f}, M~{m_m:.0f})")
    else:
        t_m, t_s, h_m, h_s, m_m, m_s = 25, 5, 65, 15, 45, 15

    SOIL_NPK = {
        "Sandy":    (20, 8, 15, 6, 12, 5),
        "Loamy":    (55,12, 40,10, 40,10),
        "Clay":     (60,10, 45,10, 45,10),
        "Silt":     (50,12, 38, 9, 38, 9),
        "Alluvial": (65,12, 50,10, 50,10),
    }

    def assign_fertilizer(N, P, K):
        n_low, p_low, k_low = N < 40, P < 20, K < 20
        if   n_low and p_low and k_low: return "NPK 20-20-20"
        elif n_low and p_low:           return "DAP"
        elif k_low:                     return "MOP"
        elif n_low:                     return "Urea"
        else:                           return "Compost"

    rows = []
    for _ in range(n):
        crop = np.random.choice(CROP_TYPES)
        soil = np.random.choice(SOIL_TYPES)
        Nm,Ns,Pm,Ps,Km,Ks = SOIL_NPK[soil]
        N    = max(0, np.random.normal(Nm, Ns))
        P    = max(0, np.random.normal(Pm, Ps))
        K    = max(0, np.random.normal(Km, Ks))
        temp = float(np.clip(np.random.normal(t_m, t_s), 8, 45))
        hum  = float(np.clip(np.random.normal(h_m, h_s), 10, 100))
        mois = float(np.clip(np.random.normal(m_m, m_s), 5, 95))
        fert = assign_fertilizer(N, P, K)
        rows.append({"Temperature": round(temp,2), "Humidity": round(hum,2),
                     "Moisture": round(mois,2), "Soil_Type": soil, "Crop_Type": crop,
                     "Nitrogen": round(N,2), "Potassium": round(K,2),
                     "Phosphorous": round(P,2), "Fertilizer_Name": fert})

    df = pd.DataFrame(rows)
    if real is not None and len(real) > 0:
        df = pd.concat([df, real], ignore_index=True)
        print(f"    Appended {len(real)} real fertilizer rows")
    df = df.sample(frac=1, random_state=42).reset_index(drop=True)
    save_generated(df, "fertilizer_synth.csv")
    return df


# ══════════════════════════════════════════════════════════════
# RUN
# ══════════════════════════════════════════════════════════════

print("\n── Cleaning old artefacts ─────────────────────────────────")
clean_saved_models()


# ──────────────────────────────────────────────────────────────
# MODEL 1 — SwiFT CROP (real Kaggle + synth for missing Nepal crops)
# ──────────────────────────────────────────────────────────────
print("\n── Model 1: SwiFT Crop Recommendation ─────────────────────")
try:
    df_real = load_real_csv("Crop_recommendation.csv")
    parts = []
    real_nepal = []
    if df_real is not None:
        df_real.columns = df_real.columns.str.strip().str.lower()
        if "label" in df_real.columns:
            df_real["label"] = df_real["label"].str.lower()
            df_real = df_real[df_real["label"].isin(NEPAL_CROPS)]
            real_nepal = sorted(df_real["label"].unique().tolist())
            if len(df_real) > 0:
                parts.append(df_real[["n","p","k","temperature","humidity","ph","rainfall","label"]])
                print(f"    Real Nepal crops ({len(real_nepal)}): {real_nepal}")

    missing = [c for c in NEPAL_CROPS if c not in real_nepal]
    if missing:
        print(f"    Synthesising {len(missing)} missing Nepal crops: {missing}")
        parts.append(synth_crops(missing, n_per_class=200))

    df_crop = pd.concat(parts, ignore_index=True) if parts else synth_crops(NEPAL_CROPS, 200)
    df_crop = df_crop.sample(frac=1, random_state=42).reset_index(drop=True)

    df_crop["npk_total"]   = df_crop["n"] + df_crop["p"] + df_crop["k"]
    df_crop["n_to_p"]      = df_crop["n"] / (df_crop["p"] + 1e-3)
    df_crop["n_to_k"]      = df_crop["n"] / (df_crop["k"] + 1e-3)
    df_crop["p_to_k"]      = df_crop["p"] / (df_crop["k"] + 1e-3)
    df_crop["heat_index"]  = df_crop["temperature"] * (1 - df_crop["humidity"] / 200)
    df_crop["water_score"] = df_crop["rainfall"] * df_crop["humidity"] / 100

    CROP_FEATS = ["n","p","k","temperature","humidity","ph","rainfall",
                  "npk_total","n_to_p","n_to_k","p_to_k","heat_index","water_score"]

    crop_le = LabelEncoder()
    y_crop  = crop_le.fit_transform(df_crop["label"].values)
    print(f"    Crops ({len(crop_le.classes_)}): {list(crop_le.classes_)}")
    print(f"    Features: {len(CROP_FEATS)}   Samples: {len(df_crop)}")

    X_crop  = df_crop[CROP_FEATS].values.astype(np.float32)
    crop_sc = StandardScaler()
    Xs      = crop_sc.fit_transform(X_crop)

    Xtr, Xte, ytr, yte = train_test_split(Xs, y_crop, test_size=0.15, random_state=42, stratify=y_crop)
    Xtr, Xval, ytr, yval = train_test_split(Xtr, ytr, test_size=0.15, random_state=42, stratify=ytr)
    Xtr, ytr = apply_smote(Xtr, ytr)

    swift_model = SwiFTCropModel(
        input_dim   = len(CROP_FEATS),
        num_classes = len(crop_le.classes_),
        hidden_dim  = 96, num_heads = 4, num_layers = 3,
        sparsity_k  = min(7, len(CROP_FEATS)), dropout = 0.15,
    )
    train_pytorch_model(swift_model, Xtr, ytr, Xval, yval,
                        epochs=80, lr=8e-4, batch_size=64, patience=15)

    swift_model.eval()
    with torch.no_grad():
        logits = swift_model(torch.tensor(Xte, dtype=torch.float32))
    y_pred = logits.argmax(dim=1).numpy()
    full_report(yte, y_pred, crop_le.classes_, "SwiFT Crop Recommendation Results")

    print("\n  Saving SwiFT artefacts...")
    save_torch(swift_model, "swift_crop_model.pth")
    save({"input_dim": len(CROP_FEATS), "num_classes": len(crop_le.classes_),
          "hidden_dim": 96, "num_heads": 4, "num_layers": 3,
          "sparsity_k": min(7, len(CROP_FEATS)), "dropout": 0.15},
         "swift_crop_config.joblib")
    save(crop_le,    "swift_crop_encoder.joblib")
    save(crop_sc,    "swift_crop_scaler.joblib")
    save(CROP_FEATS, "swift_crop_feature_names.joblib")

except Exception as e:
    print(f"  FAILED: {e}"); traceback.print_exc()


# ──────────────────────────────────────────────────────────────
# MODEL 2 — TTL IRRIGATION (hybrid 5-class, crop-aware)
# ──────────────────────────────────────────────────────────────
print("\n── Model 2: TTL Irrigation Advice ─────────────────────────")
try:
    df_irrig, crop_le_irrig, stage_le_irrig = build_irrigation_dataset(n=12000)

    NUM_FEATS  = ["soil_moisture","temperature","humidity","ph",
                  "rainfall_mm","ET0","ETc","vpd_proxy","depletion"]
    CAT_FEATS  = ["crop_type_enc", "growth_stage_enc"]
    NUM_CROPS  = len(crop_le_irrig.classes_)
    NUM_STAGES = len(stage_le_irrig.classes_)

    IRRIG_LABELS = [
        "Sufficient Moisture — No Irrigation Needed",
        "Moderate — Irrigation Recommended",
        "Moderate — Irrigation Highly Recommended",
        "Very Dry — Irrigation Needed",
        "Very Dry — Immediate Irrigation Needed",
    ]

    y_irrig = df_irrig["irrigation_label"].values
    X_num   = df_irrig[NUM_FEATS].values.astype(np.float32)
    X_cat   = df_irrig[CAT_FEATS].values.astype(np.int64)

    irrig_sc = StandardScaler()
    Xn_sc    = irrig_sc.fit_transform(X_num)

    Xn_tr, Xn_te, Xc_tr, Xc_te, y_tr, y_te = train_test_split(
        Xn_sc, X_cat, y_irrig, test_size=0.15, random_state=42, stratify=y_irrig)
    Xn_tr, Xn_val, Xc_tr, Xc_val, y_tr, y_val = train_test_split(
        Xn_tr, Xc_tr, y_tr, test_size=0.15, random_state=42, stratify=y_tr)

    print(f"  Features: {len(NUM_FEATS)} numerical + 2 categorical  |  Samples: {len(df_irrig)}")

    ttl_model = TTLIrrigationModel(
        num_numerical=len(NUM_FEATS), num_categorical=[NUM_CROPS, NUM_STAGES],
        num_classes=5, d_token=64, num_heads=4, num_layers=2,
    )
    train_pytorch_model(ttl_model, Xn_tr, y_tr, Xn_val, y_val,
                        epochs=60, lr=1e-3, batch_size=128, patience=15,
                        x_cat_tr=Xc_tr, x_cat_val=Xc_val)

    ttl_model.eval()
    with torch.no_grad():
        logits = ttl_model(torch.tensor(Xn_te, dtype=torch.float32),
                           torch.tensor(Xc_te, dtype=torch.long))
    y_pred = logits.argmax(dim=1).numpy()
    full_report(y_te, y_pred, IRRIG_LABELS, "TTL Irrigation Results")

    print("\n  Saving TTL artefacts...")
    save_torch(ttl_model, "ttl_irrigation_model.pth")
    cfg = make_ttl_config(len(NUM_FEATS), [NUM_CROPS, NUM_STAGES], 5, 64, 4, 2)
    save(cfg,             "ttl_irrigation_config.joblib")
    save(irrig_sc,        "ttl_irrigation_scaler.joblib")
    save(IRRIG_LABELS,    "ttl_irrigation_labels.joblib")
    save(NUM_FEATS,       "ttl_irrigation_num_features.joblib")
    save(crop_le_irrig,   "ttl_irrig_crop_encoder.joblib")
    save(stage_le_irrig,  "ttl_irrig_stage_encoder.joblib")

except Exception as e:
    print(f"  FAILED: {e}"); traceback.print_exc()


# ──────────────────────────────────────────────────────────────
# MODEL 3 — TABNET SOIL FERTILITY (synthetic, 5-feature schema)
# ──────────────────────────────────────────────────────────────
print("\n── Model 3: TabNet Soil Fertility ─────────────────────────")
try:
    df_soil = generate_soil_fertility_dataset(n=6000)

    SOIL_FEATS = ["N", "P", "K", "pH", "Moisture"]
    fertility_le = LabelEncoder()
    y_soil = fertility_le.fit_transform(df_soil["Fertility"].astype(str).values)
    print(f"  Classes: {list(fertility_le.classes_)}  |  Samples: {len(df_soil)}")

    X_soil  = df_soil[SOIL_FEATS].values.astype(np.float32)
    soil_sc = StandardScaler()
    Xs      = soil_sc.fit_transform(X_soil)

    Xtr, Xte, ytr, yte = train_test_split(Xs, y_soil, test_size=0.15, random_state=42, stratify=y_soil)
    Xtr, Xval, ytr, yval = train_test_split(Xtr, ytr, test_size=0.15, random_state=42, stratify=ytr)
    Xtr, ytr = apply_smote(Xtr, ytr)

    tabnet_soil = TabNetClassifier(
        n_d=32, n_a=32, n_steps=5, gamma=1.5, lambda_sparse=1e-3,
        optimizer_fn=torch.optim.Adam, optimizer_params={"lr": 2e-3},
        scheduler_fn=torch.optim.lr_scheduler.StepLR,
        scheduler_params={"step_size": 10, "gamma": 0.9},
        verbose=0, seed=42,
    )
    tabnet_soil.fit(Xtr, ytr, eval_set=[(Xval, yval)], eval_metric=["accuracy"],
                    max_epochs=150, patience=20, batch_size=256, virtual_batch_size=64)

    y_pred = tabnet_soil.predict(Xte)
    full_report(yte, y_pred, fertility_le.classes_, "TabNet Soil Fertility Results")

    print("\n  Saving TabNet Soil artefacts...")
    tabnet_soil.save_model(os.path.join(MODELS_DIR, "tabnet_soil_model"))
    print("    saved  tabnet_soil_model.zip")
    save(fertility_le, "soil_fertility_encoder.joblib")
    save(soil_sc,      "soil_feature_scaler.joblib")
    save(SOIL_FEATS,   "soil_feature_names.joblib")
    save(Xtr[:200],    "soil_lime_background.joblib")

except Exception as e:
    print(f"  FAILED: {e}"); traceback.print_exc()


# ──────────────────────────────────────────────────────────────
# MODEL 4 — TABNET FERTILIZER (synth seeded with real ranges)
# ──────────────────────────────────────────────────────────────
print("\n── Model 4: TabNet Fertilizer ─────────────────────────────")
try:
    real_fert = _load_real_fertilizer()
    df_fert = generate_fertilizer_dataset(n=10000, real=real_fert)

    fert_soil_le = LabelEncoder()
    fert_crop_le = LabelEncoder()
    fert_le      = LabelEncoder()

    df_fert["soil_enc"] = fert_soil_le.fit_transform(df_fert["Soil_Type"].astype(str))
    df_fert["crop_enc"] = fert_crop_le.fit_transform(df_fert["Crop_Type"].astype(str))
    y_fert = fert_le.fit_transform(df_fert["Fertilizer_Name"].astype(str))

    FERT_FEATS = ["Temperature","Humidity","Moisture","soil_enc","crop_enc",
                  "Nitrogen","Potassium","Phosphorous"]
    print(f"  Fertilizers ({len(fert_le.classes_)}): {list(fert_le.classes_)}")
    print(f"  Features: {len(FERT_FEATS)}   Samples: {len(df_fert)}")

    X_fert  = df_fert[FERT_FEATS].values.astype(np.float32)
    fert_sc = StandardScaler()
    Xs      = fert_sc.fit_transform(X_fert)

    Xtr, Xte, ytr, yte = train_test_split(Xs, y_fert, test_size=0.15, random_state=42, stratify=y_fert)
    Xtr, Xval, ytr, yval = train_test_split(Xtr, ytr, test_size=0.15, random_state=42, stratify=ytr)
    Xtr, ytr = apply_smote(Xtr, ytr)

    tabnet_fert = TabNetClassifier(
        n_d=32, n_a=32, n_steps=5, gamma=1.5, lambda_sparse=1e-3,
        optimizer_fn=torch.optim.Adam, optimizer_params={"lr": 2e-3},
        verbose=0, seed=42,
    )
    tabnet_fert.fit(Xtr, ytr, eval_set=[(Xval, yval)], eval_metric=["accuracy"],
                    max_epochs=150, patience=20, batch_size=256, virtual_batch_size=64)

    y_pred = tabnet_fert.predict(Xte)
    full_report(yte, y_pred, fert_le.classes_, "TabNet Fertilizer Results")

    print("\n  Saving TabNet Fertilizer artefacts...")
    tabnet_fert.save_model(os.path.join(MODELS_DIR, "tabnet_fert_model"))
    print("    saved  tabnet_fert_model.zip")
    save(fert_le,      "fert_label_encoder.joblib")
    save(fert_sc,      "fert_feature_scaler.joblib")
    save(fert_soil_le, "fert_soil_type_encoder.joblib")
    save(fert_crop_le, "fert_crop_type_encoder.joblib")
    save(FERT_FEATS,   "fert_feature_names.joblib")
    save(Xtr[:200],    "fert_lime_background.joblib")

except Exception as e:
    print(f"  FAILED: {e}"); traceback.print_exc()


print("\n" + "=" * 65)
print("  Training complete. Artefacts in ml/saved_models/")
print("  Generated/fallback datasets in ml/datasets/generated/")
print("=" * 65)
