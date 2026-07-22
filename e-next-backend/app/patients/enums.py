from enum import Enum, IntEnum

from app.accounts.enums import Gender


class PatientStatus(str, Enum):
    """Enum for status of a patient"""

    INACTIVE = "inactive"  # 0
    ADMISSION = "admission"  # 1
    DISCHARGE = "discharge"  # 2
    ORPHANE = "orphane"    # 3
    REFERRED = "referred" # 4
    


class Criticality(str, Enum):
    """Enum for criticality of a patient"""

    RED = "red"
    YELLOW = "yellow"
    GREEN = "green"
    BLACK = "black"


class Triage(str, Enum):
    """Enum for triage of a patient"""

    EMERGENT = "emergent"
    URGENT = "urgent"
    NON_URGENT = "non_urgent"
    DECEASED = "deceased"


class PersonalHz(str, Enum):
    """Enum for personal hz for patient's past medical history"""

    SMOKING = "smoking"
    ALCHOHOL = "alchohol"
    OTHERS = "others"


class MedicalHistory(str, Enum):
    """Enum for medical history for patient's past medical history"""

    DM = "dm"
    HTN = "htn"
    CAD = "cad"
    COPD = "copd"
    BA = "ba"
    CKD = "ckd"
    CLD = "cld"
    CVA = "cva"
    OTHERS = "others"


class PupilSize(str, Enum):
    """Enum for pupil size for patient's heent"""

    _1MM = "1mm"
    _2MM = "2mm"
    _3MM = "3mm"
    _4MM = "4mm"


class PupilReaction(str, Enum):
    """Enum for pupil reaction for patient's heent"""

    NORMAL = "normal"
    SLUGGISH = "sluggish"
    NON_REACTIVE = "non_reactive"


class EyeOpening(IntEnum):
    """Enum for eye opening for patient's heent"""

    NONE = 1
    TO_PAIN = 2
    TO_VOICE = 3
    SPONTANEOUS = 4


class VerbalResponse(IntEnum):
    """Enum for verbal response for patient's heent"""

    NONE = 0
    INTUBATED_VT = 1
    INCOMPLETE_SOUND = 2
    INAPPROPRIATE_WORDS = 3
    CONFUSED = 4
    ORIENTED = 5


class MotorResponse(IntEnum):
    """Enum for motor response for patient's heent"""

    NONE = 1
    EXTENSION_TO_PAIN = 2
    FLEXION_TO_PAIN = 3
    WITHDRAW_TO_PAIN = 4
    LOCALIZED_PAIN = 5
    OBEYS_COMMANDS = 6


class LL(str, Enum):
    """Enum for rll for patient's heent"""

    _1_5 = "1/5"
    _2_5 = "2/5"
    _3_5 = "3/5"
    _4_5 = "4/5"
    _5_5 = "5/5"


class BloodAnalysis(str, Enum):
    """Enum for blood analysis for patient's investigation"""

    HAEMOGLOBIN = "Haemoglobin"
    TLC = "TLC"
    PCV = "PCV"
    PLATELET = "Platelet"
    CBC = "CBC"
    B_UREA = "B. Urea"
    S_CREATININE = "S. Creatinine"
    SODIUM = "Sodium"
    POTASSIUM = "Potassium"
    CHLORIDE = "Chloride"
    BICARBONATE = "Bicarbonate"
    AMMONIA = "Ammonia"
    TOTAL_PROTEIN = "Total Protein"
    ALBUMIN = "Albumin"
    BILIRUBIN_T = "Bilirubin (T)"
    BILIRUBIN_D = "Bilirubin (D)"
    SGPT_ALT = "SGPT/ALT"
    SGOT_AST = "SGOT/AST"
    ALP = "ALP"
    GGT = "GGT"
    S_URIC_ACID = "S. Uric Acid"
    S_PHOSPHORUS = "S. Phosphorus"
    CALCIUM = "Calcium"
    MAGNESIUM = "Magnesium"
    CPK = "CPK"
    CK_MB = "CK MB"
    TROP_I = "TROP I"
    PT = "PT"
    INR = "INR"
    APTT = "APTT"
    TSH = "TSH"
    T3 = "T3"
    T4 = "T4"
    PROCALCITONIN = "Procalcitonin"
    BUN = "BUN"
    PRO_BUN = "Pro BUN"
    C_REACTIVE_PROTEIN = "C-Reactive Protein"
    URINE_R_M = "Urine R/M"
    KFT = "KFT"
    LFT = "LFT"
    A_G_RATIO = "A/G Ratio"
    NT_PRO_BNP = "NT-ProBNP"
    IL_6 = "IL-6"
    D_DIMER = "D-Dimer"
    FIBRINOGEN = "Fibrinogen"
    FDP = "FDP"
    LDH = "LDH"
    IRON_PROFILE = "Iron Profile"
    ABG = "ABG",
    CSF_BIOCHEMISTRY = "CSF BioChemistory"


class Radiology(str, Enum):
    """Enum for radiology for patient's investigation"""

    CT_SCAN = "CT Scan"
    MRI = "MRI"
    X_RAY = "X-Ray"
    ULTRASOUND = "Ultrasound"
    ECG = "ECG"


RADIOLOGY_SUBTYPES = {
    Radiology.CT_SCAN: [
        "Head",
        "Head-Contrast",
        "Neck",
        "Neck-Contrast",
        "Thorax",
        "Thorax-Contrast",
        "Abdomen",
        "Abdomen-Contrast",
        "Whole Body",
        "KUB",
        "KUB-Contrast",
        "Pelvis",
        "Pelvis-Contrast",
    ],
    Radiology.MRI: [
        "Head",
        "Head-Contrast",
        "Neck",
        "Neck-Contrast",
        "Thorax",
        "Thorax-Contrast",
        "Abdomen",
        "Abdomen-Contrast",
        "Whole Body",
        "KUB",
        "KUB-Contrast",
        "Pelvis",
        "Pelvis-Contrast",
    ],
    Radiology.X_RAY: ["Chest", "C-Spine", "Abdomen", "KUB", "Spine"],
    Radiology.ULTRASOUND: ["Whole Abdomen", "KUB", "Abdomen", "Venous Doppler", "Arterial Doppler"],
    Radiology.ECG: ["ECG"],
}


class Microbiology(str, Enum):
    """Enum for microbiology for patient's investigation"""

    BLOOD_C_S = "Blood C/S"
    ET_C_S = "ET C/S"
    ET_GRAM_STAIN = "ET-Gram Stain"
    URINE_C_S = "Urine C/S"
    CSF_GRAM_STAIN = "CSF-Gram Stain"
    BLOOD_PERIPHERAL = "Blood-Peripheral"
    BLOOD_CENTRAL_LINE = "Blood-Central Line"
    BLOOD_ARTERIAL_LINE = "Blood-Arterial Line"
    URINE_RE = "Urine R/E"
    CSF_CULTURE = "CSF-Culture"
    CSF_BIOCHEM = "CSF-Biochem"


class ArterialAnalysis(str, Enum):
    """Enum for arterial analysis for patient's investigation"""

    PH = "pH"
    PCO2 = "pCO2"
    PO2 = "pO2"
    HCL = "Hcl"
    K_PLUS = "K+"
    NA_PLUS = "Na+"
    CA2_PLUS = "Ca2+"
    CL_MINUS = "Cl-"
    LAC = "Lac"
    HBC = "Hbc"
    HCO3_MINUS_PC = "HCO3-(P)c"
    BASE_B_C = "Base (B)c"
    ANION_GAPC = "Anion Gapc"
    SO2E = "sO2e"
