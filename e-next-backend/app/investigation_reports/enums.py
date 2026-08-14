from dataclasses import dataclass
from enum import Enum
from typing import Dict, List, Optional


class InvestigationType(str, Enum):
    """Types of investigations"""

    BLOOD_ANALYSIS = "blood_analysis"
    RADIOLOGY = "radiology"
    ARTERIAL_ANALYSIS = "arterial_analysis"


# Comprehensive Blood Analysis Parameters
class BloodAnalysisParameter(str, Enum):
    """Complete blood analysis parameters for investigation reports"""

    
    # Complete Blood Count (CBC)
    HAEMOGLOBIN = "Haemoglobin"
    RBC_COUNT = "RBC Count"
    WBC_COUNT = "WBC Count"
    PLATELET_COUNT = "Platelet Count"
    NEUTROPHILS = "Neutrophils"
    PCV_HEMATOCRIT = "PCV/Hematocrit"
    MCV = "MCV"
    MCH = "MCH"
    MCHC = "MCHC"
    MPV = "MPV"

    # Differential Count
    LYMPHOCYTES = "Lymphocytes"
    MONOCYTES = "Monocytes"
    BASOPHILS = "Basophils"
    ABSOLUTE_NEUTROPHIL_COUNT = "Absolute Neutrophil Count"
    ABSOLUTE_LYMPHOCYTE = "Absolute Lymphocyte"
    ABSOLUTE_MONOCYTE = "Absolute Monocyte"

    # Coagulation Profile
    PT = "PT"
    INR = "INR"
    APTT = "aPTT"

    # Liver Function Tests
    ALBUMIN = "Albumin"
    TOTAL_BILIRUBIN = "Total Bilirubin"
    DIRECT_BILIRUBIN = "Direct Bilirubin"
    INDIRECT_BILIRUBIN = "Indirect Bilirubin"
    SGPT_ALT = "SGPT/ALT"
    SGOT_AST = "SGOT/AST"
    ALKALINE_PHOSPHATASE = "Alkaline Phosphatase"
    GGT = "GGT"
    TOTAL_PROTEIN = "Total Protein"

    # Renal Function & Electrolytes
    BLOOD_UREA = "Blood Urea"
    SERUM_CREATININE = "Serum Creatinine"
    URIC_ACID = "Uric Acid"
    SODIUM = "Sodium"
    POTASSIUM = "Potassium"
    BICARBONATE = "Bicarbonate"
    CHLORIDE = "Chloride"
    PHOSPHORUS = "Phosphorus"
    CALCIUM_TOTAL = "Calcium"
    MAGNESIUM = "Magnesium"

    # Cardiac Markers
    CPK_TOTAL = "CPK Total"
    CPK_MB = "CPK-MB"
    TROPONIN_I = "Troponin I"

    # Thyroid Function
    T3_TOTAL = "T3 Total"
    T4_TOTAL = "T4 Total"
    TSH = "TSH"

    # Others
    AMMONIA = "Ammonia"
    ESR = "ESR"
    CRP = "CRP"
    AMYLASE = "Amylase"
    LIPASE = "Lipase"
    PROCALCITONIN = "Procalcitonin"
    HIV = "HIV"
    HBSAG = "HBsAg"
    HCV = "HCV"


# Radiology Types and Subtypes
class RadiologyType(str, Enum):
    """Types of radiology investigations"""

    XRAY = "X-Ray"
    CT_SCAN = "CT Scan"
    MRI = "MRI"
    ULTRASOUND = "Ultrasound"
    # PET_SCAN = "PET Scan"
    # DEXA_SCAN = "DEXA Scan"
    # MAMMOGRAPHY = "Mammography"
    # FLUOROSCOPY = "Fluoroscopy"
    # ANGIOGRAPHY = "Angiography"
    # NUCLEAR_MEDICINE = "Nuclear Medicine"
    ECG = "ECG"


# Radiology subtypes mapping
RADIOLOGY_SUBTYPES: Dict[RadiologyType, List[str]] = {
    RadiologyType.XRAY: [
        "Chest PA",
        "Chest AP",
        "Chest Lateral",
        "Abdomen AP",
        "KUB",
        "Spine - Cervical",
        "Spine - Thoracic",
        "Spine - Lumbar",
        "Skull",
        "Pelvis",
        "Shoulder",
        "Elbow",
        "Wrist",
        "Hand",
        "Hip",
        "Knee",
        "Ankle",
        "Foot",
    ],
    RadiologyType.CT_SCAN: [
        "Head - Plain",
        "Head - Contrast",
        "Head - Angiography",
        "Neck - Plain",
        "Neck - Contrast",
        "Chest - Plain",
        "Chest - Contrast",
        "Chest - HRCT",
        "Abdomen - Plain",
        "Abdomen - Contrast",
        "Abdomen & Pelvis",
        "KUB",
        "Spine",
        "CT Angiography",
        "CT Pulmonary Angiography",
        "Whole Body",
    ],
    RadiologyType.MRI: [
        "Brain - Plain",
        "Brain - Contrast",
        "Brain - Angiography",
        "Spine - Cervical",
        "Spine - Thoracic",
        "Spine - Lumbar",
        "Abdomen",
        "Pelvis",
        "Knee",
        "Shoulder",
        "Hip",
        "Cardiac MRI",
        "MR Angiography",
        "MR Cholangiopancreatography",
        "Whole Body",
    ],
    RadiologyType.ULTRASOUND: [
        "Abdomen",
        "Pelvis",
        "KUB",
        "Chest",
        "Thyroid",
        "Breast",
        "Doppler - Carotid",
        "Doppler - Peripheral Arterial",
        "Doppler - Venous",
        "Echocardiography",
        "Obstetric",
        "Transvaginal",
        "Transrectal",
        "Musculoskeletal",
    ],
    RadiologyType.ECG: [],
}


# Arterial Blood Gas Parameters
class ArterialAnalysisParameter(str, Enum):
    """Arterial blood gas analysis parameters"""

    # Primary Parameters
    PH = "pH"
    PCO2 = "pCO2"
    PO2 = "pO2"
    HCO3_ACTUAL = "HCO3"
    # HCO3_STANDARD = "HCO3 Standard"

    # Oxygenation
    SO2 = "sO2"
    # FIO2 = "FiO2"
    # PAO2_FIO2_RATIO = "PaO2/FiO2 Ratio"
    # AA_GRADIENT = "A-a Gradient"

    # Electrolytes in ABG
    SODIUM_ABG = "Sodium (ABG)"
    POTASSIUM_ABG = "Potassium (ABG)"
    CHLORIDE_ABG = "Chloride (ABG)"
    CALCIUM_IONIZED_ABG = "Calcium Ionized (ABG)"

    # Additional Parameters
    BASE_EXCESS = "Base Excess"
    # BASE_DEFICIT = "Base Deficit"
    ANION_GAP = "Anion Gap"
    LACTATE_ABG = "Lactate (ABG)"
    GLUCOSE_ABG = "Glucose (ABG)"

    # Hemoglobin & Related
    HEMOGLOBIN_ABG = "Hemoglobin (ABG)"
    HEMATOCRIT_ABG = "Hematocrit (ABG)"

    # CO-Oximetry
    # COHB = "COHb"
    # METHB = "MetHb"

    # Temperature Corrected
    # PH_TEMP_CORRECTED = "pH (Temp Corrected)"
    # PCO2_TEMP_CORRECTED = "pCO2 (Temp Corrected)"
    # PO2_TEMP_CORRECTED = "pO2 (Temp Corrected)"


class MicrobiologyParameter(str, Enum):
    """Microbiology parameters"""

    BLOOD_CS = "Blood C/S"
    ET_CS = "ET C/S"
    ET_GRAM_STAIN = "ET-Gram Stain"
    URINE_CS = "Urine C/S"
    CSF_GRAM_STAIN = "CSF-Gram Stain"
    BLOOD_PERIPHERAL = "Blood-Peripheral"
    BLOOD_CENTRAL_LINE = "Blood-Central Line"
    BLOOD_ARTERIAL_LINE = "Blood-Arterial Line"
    URINE_RE = "Urine R/E"
    CSF_CULTURE = "CSF-Culture"
    CSF_BIOCHEM = "CSF-Biochem"


# Parameter metadata
@dataclass
class ParameterInfo:
    """Information about a test parameter"""

    display_name: str
    reference_range: Optional[str] = None
    units: Optional[str] = None
    min_value: Optional[float] = None
    max_value: Optional[float] = None


# Comprehensive parameter information dictionaries
BLOOD_PARAMETER_INFO: Dict[BloodAnalysisParameter, ParameterInfo] = {
    BloodAnalysisParameter.HAEMOGLOBIN: ParameterInfo(
        display_name="Haemoglobin",
        reference_range="12.0 - 15.0",
        units="g/dL",
        min_value=12.0,
        max_value=15.0,
    ),
    BloodAnalysisParameter.RBC_COUNT: ParameterInfo(
        display_name="RBC Count",
        reference_range="4.5 - 5.9",
        units="million cells/µL",
        min_value=4.5,
        max_value=5.9,
    ),
    BloodAnalysisParameter.WBC_COUNT: ParameterInfo(
        display_name="WBC Count",
        reference_range="4.0 - 11.0",
        units="thousand cells/µL",
        min_value=4.0,
        max_value=11.0,
    ),
    BloodAnalysisParameter.PLATELET_COUNT: ParameterInfo(
        display_name="Platelet Count",
        reference_range="150 - 450",
        units="thousand cells/µL",
        min_value=150,
        max_value=450,
    ),
      BloodAnalysisParameter.NEUTROPHILS: ParameterInfo(
        display_name="Neutrophils",
        reference_range="40 - 60",
        units="%",
        min_value=40,
        max_value=60,
    ),
    BloodAnalysisParameter.PCV_HEMATOCRIT: ParameterInfo(
        display_name="PCV/Hematocrit",
        reference_range="38.0 - 50.0",
        units="%",
        min_value=38.0,
        max_value=50.0,
    ),
    BloodAnalysisParameter.MCV: ParameterInfo(
        display_name="MCV",
        reference_range="80 - 100",
        units="fL",
        min_value=80,
        max_value=100,
    ),
    BloodAnalysisParameter.MCH: ParameterInfo(
        display_name="MCH",
        reference_range="27 - 33",
        units="pg",
        min_value=27,
        max_value=33,
    ),
    BloodAnalysisParameter.MCHC: ParameterInfo(
        display_name="MCHC",
        reference_range="32 - 36",
        units="g/dL",
        min_value=32,
        max_value=36,
    ),
    # BloodAnalysisParameter.RDW: ParameterInfo(
    #     display_name="RDW",
    #     reference_range="11.5 - 14.5",
    #     units="%",
    #     min_value=11.5,
    #     max_value=14.5,
    # ),
    BloodAnalysisParameter.MPV: ParameterInfo(
        display_name="MPV",
        reference_range="7.5 - 11.5",
        units="fL",
        min_value=7.5,
        max_value=11.5,
    ),
  
    BloodAnalysisParameter.LYMPHOCYTES: ParameterInfo(
        display_name="Lymphocytes",
        reference_range="20 - 40",
        units="%",
        min_value=20,
        max_value=40,
    ),
    BloodAnalysisParameter.MONOCYTES: ParameterInfo(
        display_name="Monocytes",
        reference_range="2 - 8",
        units="%",
        min_value=2,
        max_value=8,
    ),
    # BloodAnalysisParameter.EOSINOPHILS: ParameterInfo(
    #     display_name="Eosinophils",
    #     reference_range="1 - 4",
    #     units="%",
    #     min_value=1,
    #     max_value=4,
    # ),
    BloodAnalysisParameter.BASOPHILS: ParameterInfo(
        display_name="Basophils",
        reference_range="0.5 - 1",
        units="%",
        min_value=0.5,
        max_value=1,
    ),
    BloodAnalysisParameter.ABSOLUTE_LYMPHOCYTE: ParameterInfo(
        display_name="Absolute Lymphocyte",
        reference_range="1500 - 8000",
        units="cells/µL",
        min_value=1500,
        max_value=8000,
    ),
    BloodAnalysisParameter.ABSOLUTE_MONOCYTE: ParameterInfo(
        display_name="Absolute Monocyte",
        reference_range="200 - 800",
        units="cells/µL",
        min_value=200,
        max_value=800,
    ),
    BloodAnalysisParameter.ABSOLUTE_NEUTROPHIL_COUNT: ParameterInfo(
        display_name="Absolute Neutrophil Count",
        reference_range="1500 - 8000",
        units="cells/µL",
        min_value=1500,
        max_value=8000,
    ),
    BloodAnalysisParameter.BLOOD_UREA: ParameterInfo(
        display_name="Blood Urea",
        reference_range="7 - 20",
        units="mg/dL",
        min_value=7,
        max_value=20,
    ),
    BloodAnalysisParameter.SERUM_CREATININE: ParameterInfo(
        display_name="Serum Creatinine",
        reference_range="0.6 - 1.2",
        units="mg/dL",
        min_value=0.6,
        max_value=1.2,
    ),
    # BloodAnalysisParameter.BUN: ParameterInfo(
    #     display_name="BUN",
    #     reference_range="7 - 20",
    #     units="mg/dL",
    #     min_value=7,
    #     max_value=20,
    # ),
    # BloodAnalysisParameter.EGFR: ParameterInfo(
    #     display_name="eGFR",
    #     reference_range=">90",
    #     units="mL/min/1.73 m²",
    #     min_value=90,
    #     max_value=None,
    # ),
    # BloodAnalysisParameter.CYSTATIN_C: ParameterInfo(
    #     display_name="Cystatin C",
    #     reference_range="0.51 - 1.00",
    #     units="mg/L",
    #     min_value=0.51,
    #     max_value=1.00,
    # ),
    BloodAnalysisParameter.SODIUM: ParameterInfo(
        display_name="Sodium",
        reference_range="135 - 145",
        units="mmol/L",
        min_value=135,
        max_value=145,
    ),
    BloodAnalysisParameter.POTASSIUM: ParameterInfo(
        display_name="Potassium",
        reference_range="3.5 - 5.1",
        units="mmol/L",
        min_value=3.5,
        max_value=5.1,
    ),
    BloodAnalysisParameter.CHLORIDE: ParameterInfo(
        display_name="Chloride",
        reference_range="98 - 107",
        units="mmol/L",
        min_value=98,
        max_value=107,
    ),
    BloodAnalysisParameter.BICARBONATE: ParameterInfo(
        display_name="Bicarbonate",
        reference_range="22 - 29",
        units="mmol/L",
        min_value=22,
        max_value=29,
    ),
    BloodAnalysisParameter.CALCIUM_TOTAL: ParameterInfo(
        display_name="Calcium Total",
        reference_range="8.6 - 10.3",
        units="mg/dL",
        min_value=8.6,
        max_value=10.3,
    ),
    # BloodAnalysisParameter.CALCIUM_IONIZED: ParameterInfo(
    #     display_name="Calcium Ionized",
    #     reference_range="4.65 - 5.28",
    #     units="mg/dL",
    #     min_value=4.65,
    #     max_value=5.28,
    # ),
    BloodAnalysisParameter.MAGNESIUM: ParameterInfo(
        display_name="Magnesium",
        reference_range="1.7 - 2.2",
        units="mg/dL",
        min_value=1.7,
        max_value=2.2,
    ),
    BloodAnalysisParameter.PHOSPHORUS: ParameterInfo(
        display_name="Phosphorus",
        reference_range="2.5 - 4.5",
        units="mg/dL",
        min_value=2.5,
        max_value=4.5,
    ),
    BloodAnalysisParameter.TOTAL_BILIRUBIN: ParameterInfo(
        display_name="Total Bilirubin",
        reference_range="0.1 - 1.2",
        units="mg/dL",
        min_value=0.1,
        max_value=1.2,
    ),
    BloodAnalysisParameter.DIRECT_BILIRUBIN: ParameterInfo(
        display_name="Direct Bilirubin",
        reference_range="0.0 - 0.3",
        units="mg/dL",
        min_value=0.0,
        max_value=0.3,
    ),
    BloodAnalysisParameter.INDIRECT_BILIRUBIN: ParameterInfo(
        display_name="Indirect Bilirubin",
        reference_range="0.2 - 0.8",
        units="mg/dL",
        min_value=0.2,
        max_value=0.8,
    ),
    BloodAnalysisParameter.SGOT_AST: ParameterInfo(
        display_name="SGOT/AST",
        reference_range="10 - 40",
        units="U/L",
        min_value=10,
        max_value=40,
    ),
    BloodAnalysisParameter.SGPT_ALT: ParameterInfo(
        display_name="SGPT/ALT",
        reference_range="7 - 56",
        units="U/L",
        min_value=7,
        max_value=56,
    ),
    BloodAnalysisParameter.ALKALINE_PHOSPHATASE: ParameterInfo(
        display_name="Alkaline Phosphatase",
        reference_range="44 - 147",
        units="U/L",
        min_value=44,
        max_value=147,
    ),
    BloodAnalysisParameter.GGT: ParameterInfo(
        display_name="GGT",
        reference_range="9 - 48",
        units="U/L",
        min_value=9,
        max_value=48,
    ),
    BloodAnalysisParameter.TOTAL_PROTEIN: ParameterInfo(
        display_name="Total Protein",
        reference_range="6.0 - 8.3",
        units="g/dL",
        min_value=6.0,
        max_value=8.3,
    ),
    BloodAnalysisParameter.ALBUMIN: ParameterInfo(
        display_name="Albumin",
        reference_range="3.5 - 5.0",
        units="g/dL",
        min_value=3.5,
        max_value=5.0,
    ),
    # BloodAnalysisParameter.GLOBULIN: ParameterInfo(
    #     display_name="Globulin",
    #     reference_range="2.0 - 3.5",
    #     units="g/dL",
    #     min_value=2.0,
    #     max_value=3.5,
    # ),
    # BloodAnalysisParameter.AG_RATIO: ParameterInfo(
    #     display_name="A/G Ratio",
    #     reference_range="1.0 - 2.1",
    #     units=None,
    #     min_value=1.0,
    #     max_value=2.1,
    # ),
    BloodAnalysisParameter.TROPONIN_I: ParameterInfo(
        display_name="Troponin I",
        reference_range="< 0.04",
        units="ng/mL",
        min_value=None,
        max_value=0.04,
    ),
    # BloodAnalysisParameter.TROPONIN_T: ParameterInfo(
    #     display_name="Troponin T",
    #     reference_range="< 0.01",
    #     units="ng/mL",
    #     min_value=None,
    #     max_value=0.01,
    # ),
    BloodAnalysisParameter.CPK_TOTAL: ParameterInfo(
        display_name="CPK Total",
        reference_range="30 - 200",
        units="U/L",
        min_value=30,
        max_value=200,
    ),
    BloodAnalysisParameter.CPK_MB: ParameterInfo(
        display_name="CPK-MB",
        reference_range="0 - 25",
        units="U/L",
        min_value=0,
        max_value=25,
    ),
    # BloodAnalysisParameter.LDH: ParameterInfo(
    #     display_name="LDH",
    #     reference_range="140 - 280",
    #     units="U/L",
    #     min_value=140,
    #     max_value=280,
    # ),
    # BloodAnalysisParameter.PRO_BNP: ParameterInfo(
    #     display_name="Pro-BNP",
    #     reference_range="< 125",
    #     units="pg/mL",
    #     min_value=None,
    #     max_value=125,
    # ),
    # BloodAnalysisParameter.NT_PRO_BNP: ParameterInfo(
    #     display_name="NT-proBNP",
    #     reference_range="< 300",
    #     units="pg/mL",
    #     min_value=None,
    #     max_value=300,
    # ),
    # BloodAnalysisParameter.MYOGLOBIN: ParameterInfo(
    #     display_name="Myoglobin",
    #     reference_range="28 - 72",
    #     units="ng/mL",
    #     min_value=28,
    #     max_value=72,
    # ),
    BloodAnalysisParameter.PT: ParameterInfo(
        display_name="PT",
        reference_range="11 - 13.5",
        units="seconds",
        min_value=11,
        max_value=13.5,
    ),
    # BloodAnalysisParameter.PTT: ParameterInfo(
    #     display_name="PTT",
    #     reference_range="25 - 35",
    #     units="seconds",
    #     min_value=25,
    #     max_value=35,
    # ),
    BloodAnalysisParameter.APTT: ParameterInfo(
        display_name="aPTT",
        reference_range="30 - 40",
        units="seconds",
        min_value=30,
        max_value=40,
    ),
    BloodAnalysisParameter.INR: ParameterInfo(
        display_name="INR",
        reference_range="0.8 - 1.1",
        units=None,
        min_value=0.8,
        max_value=1.1,
    ),
    # BloodAnalysisParameter.FIBRINOGEN: ParameterInfo(
    #     display_name="Fibrinogen",
    #     reference_range="200 - 400",
    #     units="mg/dL",
    #     min_value=200,
    #     max_value=400,
    # ),
    # BloodAnalysisParameter.D_DIMER: ParameterInfo(
    #     display_name="D-Dimer",
    #     reference_range="< 500",
    #     units="ng/mL FEU",
    #     min_value=None,
    #     max_value=500,
    # ),
    # BloodAnalysisParameter.FDP: ParameterInfo(
    #     display_name="FDP",
    #     reference_range="< 10",
    #     units="µg/mL",
    #     min_value=None,
    #     max_value=10,
    # ),
    # BloodAnalysisParameter.BLEEDING_TIME: ParameterInfo(
    #     display_name="Bleeding Time",
    #     reference_range="2 - 7",
    #     units="minutes",
    #     min_value=2,
    #     max_value=7,
    # ),
    # BloodAnalysisParameter.CLOTTING_TIME: ParameterInfo(
    #     display_name="Clotting Time",
    #     reference_range="5 - 15",
    #     units="minutes",
    #     min_value=5,
    #     max_value=15,
    # ),
    BloodAnalysisParameter.TSH: ParameterInfo(
        display_name="TSH",
        reference_range="0.4 - 4.0",
        units="µIU/mL",
        min_value=0.4,
        max_value=4.0,
    ),
    BloodAnalysisParameter.T3_TOTAL: ParameterInfo(
        display_name="T3 Total",
        reference_range="80 - 200",
        units="ng/dL",
        min_value=80,
        max_value=200,
    ),
    BloodAnalysisParameter.T4_TOTAL: ParameterInfo(
        display_name="T4 Total",
        reference_range="5.0 - 12.0",
        units="µg/dL",
        min_value=5.0,
        max_value=12.0,
    ),
    # BloodAnalysisParameter.FREE_T3: ParameterInfo(
    #     display_name="Free T3",
    #     reference_range="2.3 - 4.2",
    #     units="pg/mL",
    #     min_value=2.3,
    #     max_value=4.2,
    # ),
    # BloodAnalysisParameter.FREE_T4: ParameterInfo(
    #     display_name="Free T4",
    #     reference_range="0.8 - 2.0",
    #     units="ng/dL",
    #     min_value=0.8,
    #     max_value=2.0,
    # ),
    # BloodAnalysisParameter.ANTI_TPO: ParameterInfo(
    #     display_name="Anti-TPO",
    #     reference_range="< 35",
    #     units="IU/mL",
    #     min_value=None,
    #     max_value=35,
    # ),
    # BloodAnalysisParameter.ANTI_THYROGLOBULIN: ParameterInfo(
    #     display_name="Anti-Thyroglobulin",
    #     reference_range="< 20",
    #     units="IU/mL",
    #     min_value=None,
    #     max_value=20,
    # ),
    # BloodAnalysisParameter.TOTAL_CHOLESTEROL: ParameterInfo(
    #     display_name="Total Cholesterol",
    #     reference_range="< 200",
    #     units="mg/dL",
    #     min_value=None,
    #     max_value=200,
    # ),
    # BloodAnalysisParameter.LDL_CHOLESTEROL: ParameterInfo(
    #     display_name="LDL Cholesterol",
    #     reference_range="< 100",
    #     units="mg/dL",
    #     min_value=None,
    #     max_value=100,
    # ),
    # BloodAnalysisParameter.HDL_CHOLESTEROL: ParameterInfo(
    #     display_name="HDL Cholesterol",
    #     reference_range="40 - 60",
    #     units="mg/dL",
    #     min_value=40,
    #     max_value=60,
    # ),
    # BloodAnalysisParameter.VLDL_CHOLESTEROL: ParameterInfo(
    #     display_name="VLDL Cholesterol",
    #     reference_range="5 - 40",
    #     units="mg/dL",
    #     min_value=5,
    #     max_value=40,
    # ),
    # BloodAnalysisParameter.TRIGLYCERIDES: ParameterInfo(
    #     display_name="Triglycerides",
    #     reference_range="< 150",
    #     units="mg/dL",
    #     min_value=None,
    #     max_value=150,
    # ),
    # BloodAnalysisParameter.FASTING_GLUCOSE: ParameterInfo(
    #     display_name="Fasting Glucose",
    #     reference_range="70 - 99",
    #     units="mg/dL",
    #     min_value=70,
    #     max_value=99,
    # ),
    # BloodAnalysisParameter.POSTPRANDIAL_GLUCOSE: ParameterInfo(
    #     display_name="Postprandial Glucose",
    #     reference_range="< 140",
    #     units="mg/dL",
    #     min_value=None,
    #     max_value=140,
    # ),
    # BloodAnalysisParameter.RANDOM_GLUCOSE: ParameterInfo(
    #     display_name="Random Glucose",
    #     reference_range="70 - 140",
    #     units="mg/dL",
    #     min_value=70,
    #     max_value=140,
    # ),
    # BloodAnalysisParameter.HBA1C: ParameterInfo(
    #     display_name="HbA1c",
    #     reference_range="4.0 - 5.6",
    #     units="%",
    #     min_value=4.0,
    #     max_value=5.6,
    # ),
    # BloodAnalysisParameter.INSULIN: ParameterInfo(
    #     display_name="Insulin",
    #     reference_range="2.6 - 24.9",
    #     units="µIU/mL",
    #     min_value=2.6,
    #     max_value=24.9,
    # ),
    # BloodAnalysisParameter.C_PEPTIDE: ParameterInfo(
    #     display_name="C-Peptide",
    #     reference_range="0.78 - 1.89",
    #     units="ng/mL",
    #     min_value=0.78,
    #     max_value=1.89,
    # ),
    BloodAnalysisParameter.CRP: ParameterInfo(
        display_name="CRP",
        reference_range="< 1.0",
        units="mg/dL",
        min_value=None,
        max_value=1.0,
    ),
    # BloodAnalysisParameter.HS_CRP: ParameterInfo(
    #     display_name="hs-CRP",
    #     reference_range="< 3.0",
    #     units="mg/L",
    #     min_value=None,
    #     max_value=3.0,
    # ),
    BloodAnalysisParameter.ESR: ParameterInfo(
        display_name="ESR",
        reference_range="0 - 20",
        units="mm/hr",
        min_value=0,
        max_value=20,
    ),
    BloodAnalysisParameter.PROCALCITONIN: ParameterInfo(
        display_name="Procalcitonin",
        reference_range="< 0.05",
        units="ng/mL",
        min_value=None,
        max_value=0.05,
    ),
    BloodAnalysisParameter.HIV: ParameterInfo(
        display_name="HIV",
        reference_range="Non-reactive",
        units=None,
        min_value=None,
        max_value=None,
    ),
    BloodAnalysisParameter.HBSAG: ParameterInfo(
        display_name="HBsAg",
        reference_range="Non-reactive",
        units=None,
        min_value=None,
        max_value=None,
    ),
    BloodAnalysisParameter.HCV: ParameterInfo(
        display_name="HCV",
        reference_range="Non-reactive",
        units=None,
        min_value=None,
        max_value=None,
    ),
    # BloodAnalysisParameter.FERRITIN: ParameterInfo(
    #     display_name="Ferritin",
    #     reference_range="20 - 300",
    #     units="ng/mL",
    #     min_value=20,
    #     max_value=300,
    # ),
    # BloodAnalysisParameter.IL_6: ParameterInfo(
    #     display_name="IL-6",
    #     reference_range="< 7",
    #     units="pg/mL",
    #     min_value=None,
    #     max_value=7,
    # ),
    # BloodAnalysisParameter.SERUM_IRON: ParameterInfo(
    #     display_name="Serum Iron",
    #     reference_range="60 - 170",
    #     units="µg/dL",
    #     min_value=60,
    #     max_value=170,
    # ),
    # BloodAnalysisParameter.TIBC: ParameterInfo(
    #     display_name="TIBC",
    #     reference_range="240 - 450",
    #     units="µg/dL",
    #     min_value=240,
    #     max_value=450,
    # ),
    # BloodAnalysisParameter.TRANSFERRIN_SATURATION: ParameterInfo(
    #     display_name="Transferrin Saturation",
    #     reference_range="20 - 50",
    #     units="%",
    #     min_value=20,
    #     max_value=50,
    # ),
    # BloodAnalysisParameter.TRANSFERRIN: ParameterInfo(
    #     display_name="Transferrin",
    #     reference_range="200 - 360",
    #     units="mg/dL",
    #     min_value=200,
    #     max_value=360,
    # ),
    # BloodAnalysisParameter.VITAMIN_B12: ParameterInfo(
    #     display_name="Vitamin B12",
    #     reference_range="200 - 900",
    #     units="pg/mL",
    #     min_value=200,
    #     max_value=900,
    # ),
    # BloodAnalysisParameter.FOLATE: ParameterInfo(
    #     display_name="Folate",
    #     reference_range="2.7 - 17.0",
    #     units="ng/mL",
    #     min_value=2.7,
    #     max_value=17.0,
    # ),
    # BloodAnalysisParameter.VITAMIN_D: ParameterInfo(
    #     display_name="Vitamin D",
    #     reference_range="30 - 100",
    #     units="ng/mL",
    #     min_value=30,
    #     max_value=100,
    # ),
    # BloodAnalysisParameter.CORTISOL: ParameterInfo(
    #     display_name="Cortisol",
    #     reference_range="6 - 23",
    #     units="µg/dL",
    #     min_value=6,
    #     max_value=23,
    # ),
    # BloodAnalysisParameter.TESTOSTERONE: ParameterInfo(
    #     display_name="Testosterone",
    #     reference_range="300 - 1000",
    #     units="ng/dL",
    #     min_value=300,
    #     max_value=1000,
    # ),
    # BloodAnalysisParameter.PROLACTIN: ParameterInfo(
    #     display_name="Prolactin",
    #     reference_range="5 - 20",
    #     units="ng/mL",
    #     min_value=5,
    #     max_value=20,
    # ),
    # BloodAnalysisParameter.LH: ParameterInfo(
    #     display_name="LH",
    #     reference_range="1.8 - 8.6",
    #     units="IU/L",
    #     min_value=1.8,
    #     max_value=8.6,
    # ),
    # BloodAnalysisParameter.FSH: ParameterInfo(
    #     display_name="FSH",
    #     reference_range="1.5 - 12.4",
    #     units="IU/L",
    #     min_value=1.5,
    #     max_value=12.4,
    # ),
    # BloodAnalysisParameter.ESTRADIOL: ParameterInfo(
    #     display_name="Estradiol",
    #     reference_range="15 - 350",
    #     units="pg/mL",
    #     min_value=15,
    #     max_value=350,
    # ),
    # BloodAnalysisParameter.PROGESTERONE: ParameterInfo(
    #     display_name="Progesterone",
    #     reference_range="0.2 - 25",
    #     units="ng/mL",
    #     min_value=0.2,
    #     max_value=25,
    # ),
    # BloodAnalysisParameter.AFP: ParameterInfo(
    #     display_name="AFP",
    #     reference_range="< 10",
    #     units="ng/mL",
    #     min_value=None,
    #     max_value=10,
    # ),
    # BloodAnalysisParameter.CEA: ParameterInfo(
    #     display_name="CEA",
    #     reference_range="< 5",
    #     units="ng/mL",
    #     min_value=None,
    #     max_value=5,
    # ),
    # BloodAnalysisParameter.CA_125: ParameterInfo(
    #     display_name="CA-125",
    #     reference_range="< 35",
    #     units="U/mL",
    #     min_value=None,
    #     max_value=35,
    # ),
    # BloodAnalysisParameter.CA_19_9: ParameterInfo(
    #     display_name="CA 19-9",
    #     reference_range="< 37",
    #     units="U/mL",
    #     min_value=None,
    #     max_value=37,
    # ),
    # BloodAnalysisParameter.PSA: ParameterInfo(
    #     display_name="PSA",
    #     reference_range="< 4.0",
    #     units="ng/mL",
    #     min_value=None,
    #     max_value=4.0,
    # ),
    # BloodAnalysisParameter.FREE_PSA: ParameterInfo(
    #     display_name="Free PSA",
    #     reference_range="Free PSA % > 25%",
    #     units="ng/mL",
    #     min_value=None,
    #     max_value=None,
    # ),
    BloodAnalysisParameter.URIC_ACID: ParameterInfo(
        display_name="Uric Acid",
        reference_range="3.5 - 7.2",
        units="mg/dL",
        min_value=3.5,
        max_value=7.2,
    ),
    BloodAnalysisParameter.AMMONIA: ParameterInfo(
        display_name="Ammonia",
        reference_range="15 - 45",
        units="µmol/L",
        min_value=15,
        max_value=45,
    ),
    # BloodAnalysisParameter.LACTATE: ParameterInfo(
    #     display_name="Lactate",
    #     reference_range="0.5 - 2.2",
    #     units="mmol/L",
    #     min_value=0.5,
    #     max_value=2.2,
    # ),
    BloodAnalysisParameter.AMYLASE: ParameterInfo(
        display_name="Amylase",
        reference_range="30 - 100",
        units="U/L",
        min_value=30,
        max_value=100,
    ),
    BloodAnalysisParameter.LIPASE: ParameterInfo(
        display_name="Lipase",
        reference_range="0 - 160",
        units="U/L",
        min_value=0,
        max_value=160,
    ),
    # BloodAnalysisParameter.G6PD: ParameterInfo(
    #     display_name="G6PD",
    #     reference_range="5.5 - 20.5",
    #     units="U/g Hb",
    #     min_value=5.5,
    #     max_value=20.5,
    # ),
    # BloodAnalysisParameter.OSMOLALITY: ParameterInfo(
    #     display_name="Osmolality",
    #     reference_range="275 - 295",
    #     units="mOsm/kg",
    #     min_value=275,
    #     max_value=295,
    # ),
}


ARTERIAL_PARAMETER_INFO: Dict[ArterialAnalysisParameter, ParameterInfo] = {
    ArterialAnalysisParameter.PH: ParameterInfo(
        display_name="pH",
        reference_range="7.35 - 7.45",
        units=None,
        min_value=7.35,
        max_value=7.45,
    ),
    ArterialAnalysisParameter.PCO2: ParameterInfo(
        display_name="pCO2",
        reference_range="35 - 45",
        units="mmHg",
        min_value=35,
        max_value=45,
    ),
    ArterialAnalysisParameter.PO2: ParameterInfo(
        display_name="pO2",
        reference_range="75 - 100",
        units="mmHg",
        min_value=75,
        max_value=100,
    ),
    ArterialAnalysisParameter.HCO3_ACTUAL: ParameterInfo(
        display_name="HCO3",
        reference_range="22 - 26",
        units="mEq/L",
        min_value=22,
        max_value=26,
    ),
    # ArterialAnalysisParameter.HCO3_STANDARD: ParameterInfo(
    #     display_name="HCO3 Standard",
    #     reference_range="22 - 26",
    #     units="mEq/L",
    #     min_value=22,
    #     max_value=26,
    # ),
    ArterialAnalysisParameter.SO2: ParameterInfo(
        display_name="sO2",
        reference_range="95 - 100",
        units="%",
        min_value=95,
        max_value=100,
    ),
    # ArterialAnalysisParameter.FIO2: ParameterInfo(
    #     display_name="FiO2",
    #     reference_range="0.21 (room air) - 1.00",
    #     units=None,
    #     min_value=0.21,
    #     max_value=1.0,
    # ),
    # ArterialAnalysisParameter.PAO2_FIO2_RATIO: ParameterInfo(
    #     display_name="PaO2/FiO2 Ratio",
    #     reference_range="400 - 500",
    #     units=None,
    #     min_value=400,
    #     max_value=500,
    # ),
    # ArterialAnalysisParameter.AA_GRADIENT: ParameterInfo(
    #     display_name="A-a Gradient",
    #     reference_range="5 - 15",
    #     units="mmHg",
    #     min_value=5,
    #     max_value=15,
    # ),
    ArterialAnalysisParameter.SODIUM_ABG: ParameterInfo(
        display_name="Sodium (ABG)",
        reference_range="135 - 145",
        units="mmol/L",
        min_value=135,
        max_value=145,
    ),
    ArterialAnalysisParameter.POTASSIUM_ABG: ParameterInfo(
        display_name="Potassium (ABG)",
        reference_range="3.5 - 5.1",
        units="mmol/L",
        min_value=3.5,
        max_value=5.1,
    ),
    ArterialAnalysisParameter.CHLORIDE_ABG: ParameterInfo(
        display_name="Chloride (ABG)",
        reference_range="98 - 106",
        units="mmol/L",
        min_value=98,
        max_value=106,
    ),
    ArterialAnalysisParameter.CALCIUM_IONIZED_ABG: ParameterInfo(
        display_name="Calcium Ionized (ABG)",
        reference_range="1.12 - 1.32",
        units="mmol/L",
        min_value=1.12,
        max_value=1.32,
    ),
    ArterialAnalysisParameter.BASE_EXCESS: ParameterInfo(
        display_name="Base Excess",
        reference_range="-2 to +2",
        units="mEq/L",
        min_value=-2,
        max_value=2,
    ),
    # ArterialAnalysisParameter.BASE_DEFICIT: ParameterInfo(
    #     display_name="Base Deficit",
    #     reference_range="-2 to +2",
    #     units="mEq/L",
    #     min_value=-2,
    #     max_value=2,
    # ),
    ArterialAnalysisParameter.ANION_GAP: ParameterInfo(
        display_name="Anion Gap",
        reference_range="8 - 16",
        units="mEq/L",
        min_value=8,
        max_value=16,
    ),
    ArterialAnalysisParameter.LACTATE_ABG: ParameterInfo(
        display_name="Lactate (ABG)",
        reference_range="0.5 - 2.2",
        units="mmol/L",
        min_value=0.5,
        max_value=2.2,
    ),
    ArterialAnalysisParameter.GLUCOSE_ABG: ParameterInfo(
        display_name="Glucose (ABG)",
        reference_range="70 - 100",
        units="mg/dL",
        min_value=70,
        max_value=100,
    ),
    ArterialAnalysisParameter.HEMOGLOBIN_ABG: ParameterInfo(
        display_name="Hemoglobin (ABG)",
        reference_range="12 - 16",
        units="g/dL",
        min_value=12,
        max_value=16,
    ),
    ArterialAnalysisParameter.HEMATOCRIT_ABG: ParameterInfo(
        display_name="Hematocrit (ABG)",
        reference_range="36 - 46",
        units="%",
        min_value=36,
        max_value=46,
    ),
    # ArterialAnalysisParameter.COHB: ParameterInfo(
    #     display_name="COHb",
    #     reference_range="< 2",
    #     units="%",
    #     min_value=None,
    #     max_value=2,
    # ),
    # ArterialAnalysisParameter.METHB: ParameterInfo(
    #     display_name="MetHb",
    #     reference_range="< 1.5",
    #     units="%",
    #     min_value=None,
    #     max_value=1.5,
    # ),
    # ArterialAnalysisParameter.PH_TEMP_CORRECTED: ParameterInfo(
    #     display_name="pH (Temp Corrected)",
    #     reference_range="7.35 - 7.45",
    #     units=None,
    #     min_value=7.35,
    #     max_value=7.45,
    # ),
    # ArterialAnalysisParameter.PCO2_TEMP_CORRECTED: ParameterInfo(
    #     display_name="pCO2 (Temp Corrected)",
    #     reference_range="35 - 45",
    #     units="mmHg",
    #     min_value=35,
    #     max_value=45,
    # ),
    # ArterialAnalysisParameter.PO2_TEMP_CORRECTED: ParameterInfo(
    #     display_name="pO2 (Temp Corrected)",
    #     reference_range="75 - 100",
    #     units="mmHg",
    #     min_value=75,
    #     max_value=100,
    # ),
}


MICROBIOLOGY_PARAMETER_INFO: Dict[MicrobiologyParameter, ParameterInfo] = {
    MicrobiologyParameter.BLOOD_CS: ParameterInfo(
        display_name="Blood C/S",
        reference_range="No Growth",
        units=None,
        min_value=None,
        max_value=None,
    ),
    MicrobiologyParameter.ET_CS: ParameterInfo(
        display_name="ET C/S",
        reference_range="No Growth",
        units=None,
        min_value=None,
        max_value=None,
    ),
    MicrobiologyParameter.ET_GRAM_STAIN: ParameterInfo(
        display_name="ET-Gram Stain",
        reference_range="No Pathogenic Organisms",
        units=None,
        min_value=None,
        max_value=None,
    ),
    MicrobiologyParameter.URINE_CS: ParameterInfo(
        display_name="Urine C/S",
        reference_range="No Growth",
        units=None,
        min_value=None,
        max_value=None,
    ),
    MicrobiologyParameter.CSF_GRAM_STAIN: ParameterInfo(
        display_name="CSF-Gram Stain",
        reference_range="No Pathogenic Organisms",
        units=None,
        min_value=None,
        max_value=None,
    ),
    MicrobiologyParameter.BLOOD_PERIPHERAL: ParameterInfo(
        display_name="Blood-Peripheral",
        reference_range="No Growth",
        units=None,
        min_value=None,
        max_value=None,
    ),
    MicrobiologyParameter.BLOOD_CENTRAL_LINE: ParameterInfo(
        display_name="Blood-Central Line",
        reference_range="No Growth",
        units=None,
        min_value=None,
        max_value=None,
    ),
    MicrobiologyParameter.BLOOD_ARTERIAL_LINE: ParameterInfo(
        display_name="Blood-Arterial Line",
        reference_range="No Growth",
        units=None,
        min_value=None,
        max_value=None,
    ),
    MicrobiologyParameter.URINE_RE: ParameterInfo(
        display_name="Urine R/E",
        reference_range="No Significant Pyuria/Bacteriuria",
        units=None,
        min_value=None,
        max_value=None,
    ),
    MicrobiologyParameter.CSF_CULTURE: ParameterInfo(
        display_name="CSF-Culture",
        reference_range="No Growth",
        units=None,
        min_value=None,
        max_value=None,
    ),
    MicrobiologyParameter.CSF_BIOCHEM: ParameterInfo(
        display_name="CSF-Biochem",
        reference_range="No Growth",
        units=None,
        min_value=None,
        max_value=None,
    ),
}


# Progress Sheet Parameters
# GCS Parameters
class GCSParameter(str, Enum):
    """GCS Parameters"""

    EYE_OPENING = "Eye Opening"
    VERBAL_RESPONSE = "Verbal Response"
    MOTOR_RESPONSE = "Motor Response"
    RIGHT_PUPIL_SIZE = "Right Pupil Size"
    LEFT_PUPIL_SIZE = "Left Pupil Size"
    RIGHT_PUPIL_REACTION = "Right Pupil Reaction"
    LEFT_PUPIL_REACTION = "Left Pupil Reaction"
    RUL = "RUL"
    LUL = "LUL"
    LLL = "LLL"
    RLL = "RLL"
    PUPIL_TYPE = "Pupil Type"
    SEDATION = "Sedation"
    PAIN = "Pain"


GCS_PARAMETER_INFO: Dict[GCSParameter, ParameterInfo] = {
    GCSParameter.EYE_OPENING: ParameterInfo(
        display_name="Eye Opening (E)",
        reference_range="1 - 4 (1=No eye opening, 4=Spontaneous)",
        units=None,
        min_value=1,
        max_value=4,
    ),
    GCSParameter.VERBAL_RESPONSE: ParameterInfo(
        display_name="Verbal Response (V)",
        reference_range="1 - 5 (1=No verbal response, 5=Oriented)",
        units=None,
        min_value=1,
        max_value=5,
    ),
    GCSParameter.MOTOR_RESPONSE: ParameterInfo(
        display_name="Motor Response (M)",
        reference_range="1 - 6 (1=No motor response, 6=Obeys commands)",
        units=None,
        min_value=1,
        max_value=6,
    ),
    GCSParameter.RIGHT_PUPIL_SIZE: ParameterInfo(
        display_name="Right Pupil Size",
        reference_range="2 - 4",
        units="mm",
        min_value=2,
        max_value=4,
    ),
    GCSParameter.LEFT_PUPIL_SIZE: ParameterInfo(
        display_name="Left Pupil Size",
        reference_range="2 - 4",
        units="mm",
        min_value=2,
        max_value=4,
    ),
    GCSParameter.RIGHT_PUPIL_REACTION: ParameterInfo(
        display_name="Right Pupil Reaction",
        reference_range="Equal and Reactive",
        units=None,
        min_value=None,
        max_value=None,
    ),
    GCSParameter.LEFT_PUPIL_REACTION: ParameterInfo(
        display_name="Left Pupil Reaction",
        reference_range="Equal and Reactive",
        units=None,
        min_value=None,
        max_value=None,
    ),
    GCSParameter.RUL: ParameterInfo(
        display_name="RUL",
        reference_range=None,
        units=None,
        min_value=None,
        max_value=None,
    ),
    GCSParameter.LUL: ParameterInfo(
        display_name="LUL",
        reference_range=None,
        units=None,
        min_value=None,
        max_value=None,
    ),
    GCSParameter.LLL: ParameterInfo(
        display_name="LLL",
        reference_range=None,
        units=None,
        min_value=None,
        max_value=None,
    ),
    GCSParameter.RLL: ParameterInfo(
        display_name="RLL",
        reference_range=None,
        units=None,
        min_value=None,
        max_value=None,
    ),
    GCSParameter.PUPIL_TYPE: ParameterInfo(
        display_name="Pupil Type",
        reference_range="Equal and Reactive",
        units=None,
        min_value=None,
        max_value=None,
    ),
    GCSParameter.SEDATION: ParameterInfo(
        display_name="Sedation",
        reference_range="None or as documented",
        units=None,
        min_value=None,
        max_value=None,
    ),
    GCSParameter.PAIN: ParameterInfo(
        display_name="Pain",
        reference_range="Absent or Present",
        units=None,
        min_value=None,
        max_value=None,
    ),
}


# Fluid Balance Parameters
# Infusions
class InfusionParameter(str, Enum):
    """Infusion Parameters"""
    SEDATIVES_FENTANYL = "Fentanyl  - (Sedatives)"
    SEDATIVES_MIDAZOLAM = "Midazolam -(Sedatives)"
    SEDATIVES_DEXMEDITOMEDINE = "Dexmeditomedine -(Sedatives)"
    MUSCLE_RELAXANTS = "Atra curium -(Muscle relaxants)"
    INOTROPES_ADRENALINE     = "Adrenaline -(Inotropes)"
    INOTROPES_DOPAMINE = "Dopamine  -(Inotropes)"
    VASOPRESSORS_NORADRENALINE = "Noradrenaline - (Vasopressors)"
    VASOPRESSORS_VASOPRESSIN = "Vasopressin -(Vasopressors)"

    # SEDATIVES = "Sedatives"
    # VASOPRESSIN = "Vasopressin"
    # INOTROPES = "Inotropes"
    OTHER_INFUSIONS = "Other Infusions"

    @classmethod
    def _normalize_name(cls, value: str) -> str:
        """Strip zero-width chars / collapse spaces so legacy DB values match."""
        cleaned = (
            value.replace("\u200b", "")
            .replace("\u200c", "")
            .replace("\u200d", "")
            .replace("\u2060", "")
            .replace("\ufeff", "")
            .replace("\u00a0", " ")
        )
        cleaned = " ".join(cleaned.split())
        cleaned = cleaned.replace(" )", ")")
        return cleaned

    @classmethod
    def _missing_(cls, value):
        # Accept legacy stored names (e.g. with U+2060 word joiner) as current enum members
        if not isinstance(value, str):
            return None
        normalized = cls._normalize_name(value)
        for member in cls:
            if cls._normalize_name(member.value) == normalized:
                return member
        return None


INFUSION_PARAMETER_INFO: Dict[InfusionParameter, ParameterInfo] = {
    InfusionParameter.SEDATIVES_FENTANYL: ParameterInfo(
        display_name="Fentanyl - (Sedatives)",
        reference_range="Varies by drug",
        units="mg/hr or mcg/kg/min",
        min_value=None,
        max_value=None,
    ),
    InfusionParameter.SEDATIVES_MIDAZOLAM: ParameterInfo(
        display_name="Midazolam - (Sedatives)",
        reference_range="Varies by drug",
        units="mg/hr or mcg/kg/min",
        min_value=None,
        max_value=None,
    ),
    InfusionParameter.SEDATIVES_DEXMEDITOMEDINE: ParameterInfo(
        display_name="Dexmeditomedine - (Sedatives)",
        reference_range="Varies by drug",
        units="mg/hr or mcg/kg/min",
        min_value=None,
        max_value=None,
    ),
    InfusionParameter.MUSCLE_RELAXANTS: ParameterInfo(
        display_name="Atra curium - (Muscle relaxants)",
        reference_range="0.01 - 0.04",
        units="units/min",
        min_value=0.01,
        max_value=0.04,
    ),
    InfusionParameter.INOTROPES_ADRENALINE: ParameterInfo(
        display_name="Adrenaline - (Inotropes)",
        reference_range="Varies by drug",
        units="mcg/kg/min",
        min_value=None,
        max_value=None,
    ),
    InfusionParameter.INOTROPES_DOPAMINE: ParameterInfo(
        display_name="Dopamine - (Inotropes)",
        reference_range="Varies by drug",
        units="mcg/kg/min",
        min_value=None,
        max_value=None,
    ),
    InfusionParameter.VASOPRESSORS_NORADRENALINE: ParameterInfo(
        display_name="Noradrenaline - (Vasopressors)",
        reference_range="Varies by drug",
        units="mcg/kg/min",
        min_value=None,
        max_value=None,
    ),
    InfusionParameter.VASOPRESSORS_VASOPRESSIN: ParameterInfo(
        display_name="Vasopressin - (Vasopressors)",
        reference_range="Varies by drug",
        units="mcg/kg/min",
        min_value=None,
        max_value=None,
    ),
    InfusionParameter.OTHER_INFUSIONS: ParameterInfo(
        display_name="Other Infusions",
        reference_range="Varies",
        units=None,
        min_value=None,
        max_value=None,
    ),
}


class IntakeType(str, Enum):
    """Intake Type"""

    COLLOID_1 = "Colloid 1"
    COLLOID_2 = "Colloid 2"
    COLLOID_3 = "Colloid 3"
    COLLOID_4 = "Colloid 4"
    COLLOID_5 = "Colloid 5"
    COLLOID_6 = "Colloid 6"
    COLLOID_7 = "Colloid 7"
    COLLOID_8 = "Colloid 8"
    COLLOID_9 = "Colloid 9"
    COLLOID_10 = "Colloid 10"
    ORAL = "Oral"
    RILES_TUBE = "Riles Tube"
    OTHER_INTAKE = "Other Intake"


INTAKE_PARAMETER_INFO: Dict[IntakeType, ParameterInfo] = {
    IntakeType.COLLOID_1: ParameterInfo(
        display_name="Colloid 1",
        reference_range="0 - 2000",
        units="mL/day",
        min_value=0,
        max_value=2000,
    ),
    IntakeType.COLLOID_2: ParameterInfo(
        display_name="Colloid 2",
        reference_range="0 - 2000",
        units="mL/day",
        min_value=0,
        max_value=2000,
    ),
    IntakeType.COLLOID_3: ParameterInfo(
        display_name="Colloid 3",
        reference_range="0 - 2000",
        units="mL/day",
        min_value=0,
        max_value=2000,
    ),
    IntakeType.COLLOID_4: ParameterInfo(
        display_name="Colloid 4",
        reference_range="0 - 2000",
        units="mL/day",
        min_value=0,
        max_value=2000,
    ),
    IntakeType.COLLOID_5: ParameterInfo(
        display_name="Colloid 5",
        reference_range="0 - 2000",
        units="mL/day",
        min_value=0,
        max_value=2000,
    ),
    IntakeType.COLLOID_6: ParameterInfo(
        display_name="Colloid 6",
        reference_range="0 - 2000",
        units="mL/day",
        min_value=0,
        max_value=2000,
    ),
    IntakeType.COLLOID_7: ParameterInfo(
        display_name="Colloid 7",
        reference_range="0 - 2000",
        units="mL/day",
        min_value=0,
        max_value=2000,
    ),
    IntakeType.COLLOID_8: ParameterInfo(
        display_name="Colloid 8",
        reference_range="0 - 2000",
        units="mL/day",
        min_value=0,
        max_value=2000,
    ),
    IntakeType.COLLOID_9: ParameterInfo(
        display_name="Colloid 9",
        reference_range="0 - 2000",
        units="mL/day",
        min_value=0,
        max_value=2000,
    ),
    IntakeType.COLLOID_10: ParameterInfo(
        display_name="Colloid 10",
        reference_range="0 - 2000",
        units="mL/day",
        min_value=0,
        max_value=2000,
    ),
    IntakeType.ORAL: ParameterInfo(
        display_name="Oral",
        reference_range="0 - 3000",
        units="mL/day",
        min_value=0,
        max_value=3000,
    ),
    IntakeType.RILES_TUBE: ParameterInfo(
        display_name="Riles Tube",
        reference_range="0 - 3000",
        units="mL/day",
        min_value=0,
        max_value=3000,
    ),
    IntakeType.OTHER_INTAKE: ParameterInfo(
        display_name="Other Intake",
        reference_range="Varies",
        units="mL/day",
        min_value=None,
        max_value=None,
    ),
}


# Vitals Parameters
class VitalParameter(str, Enum):
    """Vital Parameters"""

    HEART_RATE = "Heart Rate"
    RYTHM = "Rythm"
    TEMP_ORAL = "Temp Oral"
    CVP = "CVP"
    RBS = "RBS"
    SPO2 = "SpO2"
    SYSTOLIC = "Systolic"
    DIASTOLIC = "Diastolic"


VITAL_PARAMETER_INFO: Dict[VitalParameter, ParameterInfo] = {
    VitalParameter.HEART_RATE: ParameterInfo(
        display_name="Heart Rate",
        reference_range="60 - 100",
        units="beats per minute",
        min_value=60,
        max_value=100,
    ),
    VitalParameter.RYTHM: ParameterInfo(
        display_name="Rythm",
        reference_range="Regular",
        units=None,
        min_value=None,
        max_value=None,
    ),
    VitalParameter.TEMP_ORAL: ParameterInfo(
        display_name="Temp (F) Oral",
        reference_range="97.7 - 99.5",
        units="°F",
        min_value=97.7,
        max_value=99.5,
    ),
    VitalParameter.CVP: ParameterInfo(
        display_name="CVP",
        reference_range="2 - 8",
        units="mmHg",
        min_value=2,
        max_value=8,
    ),
    VitalParameter.RBS: ParameterInfo(
        display_name="RBS",
        reference_range="2 - 10",
        units="mmHg",
        min_value=2,
        max_value=10,
    ),
    VitalParameter.SPO2: ParameterInfo(
        display_name="SpO2",
        reference_range="95 - 100",
        units="%",
        min_value=95,
        max_value=100,
    ),
    VitalParameter.SYSTOLIC: ParameterInfo(
        display_name="Systolic",
        reference_range="90 - 120",
        units="mmHg",
        min_value=90,
        max_value=120,
    ),
    VitalParameter.DIASTOLIC: ParameterInfo(
        display_name="Diastolic",
        reference_range="60 - 80",
        units="mmHg",
        min_value=60,
        max_value=80,
    ),
}


# Blood Gases
class BloodGasParameter(str, Enum):
    """Blood Gas Parameters"""

    PH = "pH"
    PO2 = "pO2"
    CO2_P = "CO2-P"
    CO2_ET = "CO2-ET"
    BE = "BE"
    SAT = "Sat %"
    LAC = "Lac"
    K_PLUS = "K+"
    HB = "Hb"
    GLUCOSE = "Glucose"
    INSULIN = "Insulin"


BLOOD_GAS_PARAMETER_INFO: Dict[BloodGasParameter, ParameterInfo] = {
    BloodGasParameter.PH: ParameterInfo(
        display_name="pH",
        reference_range="7.35 - 7.45",
        units=None,
        min_value=7.35,
        max_value=7.45,
    ),
    BloodGasParameter.PO2: ParameterInfo(
        display_name="pO2",
        reference_range="75 - 100",
        units="mmHg",
        min_value=75,
        max_value=100,
    ),
    BloodGasParameter.CO2_P: ParameterInfo(
        display_name="CO2-P",
        reference_range="35 - 45",
        units="mmHg",
        min_value=35,
        max_value=45,
    ),
    BloodGasParameter.CO2_ET: ParameterInfo(
        display_name="CO2-ET",
        reference_range="35 - 45",
        units="mmHg",
        min_value=35,
        max_value=45,
    ),
    BloodGasParameter.BE: ParameterInfo(
        display_name="BE",
        reference_range="-2 to +2",
        units="mEq/L",
        min_value=-2,
        max_value=2,
    ),
    BloodGasParameter.SAT: ParameterInfo(
        display_name="Sat %",
        reference_range="95 - 100",
        units="%",
        min_value=95,
        max_value=100,
    ),
    BloodGasParameter.LAC: ParameterInfo(
        display_name="Lac",
        reference_range="0.5 - 2.2",
        units="mmol/L",
        min_value=0.5,
        max_value=2.2,
    ),
    BloodGasParameter.K_PLUS: ParameterInfo(
        display_name="K+",
        reference_range="3.5 - 5.1",
        units="mmol/L",
        min_value=3.5,
        max_value=5.1,
    ),
    BloodGasParameter.HB: ParameterInfo(
        display_name="Hb",
        reference_range="12 - 16",
        units="g/dL",
        min_value=12,
        max_value=16,
    ),
    BloodGasParameter.GLUCOSE: ParameterInfo(
        display_name="Glucose",
        reference_range="70 - 100",
        units="mg/dL",
        min_value=70,
        max_value=100,
    ),
    BloodGasParameter.INSULIN: ParameterInfo(
        display_name="Insulin",
        reference_range="2.6 - 24.9",
        units="µIU/mL",
        min_value=2.6,
        max_value=24.9,
    ),
}


# Respiratory Parameters
class RespiratoryParameter(str, Enum):
    """Respiratory Parameters"""

    VENT_MODE = "Vent Mode"
    RATE = "Rate"
    FIO2 = "FiO2"
    PEEP = "PEEP"
    SET = "Set"
    DELTA_P = "Dalta P (P Plat PEEP)"
    AW_PRESSURE = "AW Pressure"
    INS = "Ins %"
    PEAK_PRESSURE = "Peak Pressure"
    PLATEAU_PRESSURE = "Plateau Pressure"
    REMARKS = "Remarks"
    ETV = "ETV"
    ITV = "ITV"
    IPAP = "I PAP"
    EPAP = "E PAP"
    OXYGEN_FLOW = "Oxygen Flow"
    OXYGEN_DEVICE = "Oxygen Device"
    TYPE = "Type"


RESPIRATORY_PARAMETER_INFO: Dict[RespiratoryParameter, ParameterInfo] = {
    RespiratoryParameter.VENT_MODE: ParameterInfo(
        display_name="Vent Mode",
        reference_range="e.g., Assist-Control, SIMV, CPAP",
        units=None,
        min_value=None,
        max_value=None,
    ),
    RespiratoryParameter.OXYGEN_FLOW: ParameterInfo(
        display_name="Oxygen Flow",
        reference_range="0 - 100",
        units="L/min",
        min_value=0,
        max_value=100,
    ),
    RespiratoryParameter.OXYGEN_DEVICE: ParameterInfo(
        display_name="Oxygen Device",
        reference_range="e.g., Oxygen Mask, Oxygen Cylinder",
        units=None,
        min_value=None,
        max_value=None,
    ),
    RespiratoryParameter.TYPE: ParameterInfo(
        display_name="Type",
        reference_range="e.g., Oxygen, Air",
        units=None,
        min_value=None,
        max_value=None,
    ),
    RespiratoryParameter.RATE: ParameterInfo(
        display_name="Rate",
        reference_range="10 - 20",
        units="breaths per minute",
        min_value=10,
        max_value=20,
    ),
    RespiratoryParameter.IPAP: ParameterInfo(
        display_name="IPAP",
        reference_range=None,
        units="cmH2O",
        min_value=None,
        max_value=None,
    ),
    RespiratoryParameter.EPAP: ParameterInfo(
        display_name="EPAP",
        reference_range=None,
        units="cmH2O",
        min_value=None,
        max_value=None,
    ),
    RespiratoryParameter.FIO2: ParameterInfo(
        display_name="FiO2",
        reference_range="0.21 - 1.00",
        units="fraction",
        min_value=0.21,
        max_value=1.0,
    ),
    RespiratoryParameter.PEEP: ParameterInfo(
        display_name="PEEP (cmH2O)",
        reference_range="3 - 5",
        units="cmH2O",
        min_value=3,
        max_value=5,
    ),
    RespiratoryParameter.SET: ParameterInfo(
        display_name="Set",
        reference_range=None,
        units=None,
        min_value=None,
        max_value=None,
    ),
    RespiratoryParameter.ETV: ParameterInfo(
        display_name="ETV",
        reference_range=None,
        units=None,
        min_value=None,
        max_value=None,
    ),
    RespiratoryParameter.ITV: ParameterInfo(
        display_name="ITV",
        reference_range=None,
        units=None,
        min_value=None,
        max_value=None,
    ),
    RespiratoryParameter.DELTA_P: ParameterInfo(
        display_name="Delta P (P Plat PEEP)",
        reference_range=None,
        units=None,
        min_value=None,
        max_value=None,
    ),
    RespiratoryParameter.AW_PRESSURE: ParameterInfo(
        display_name="AW Pressure",
        reference_range="5 - 15",
        units="cmH2O",
        min_value=5,
        max_value=15,
    ),
    RespiratoryParameter.INS: ParameterInfo(
        display_name="Ins %",
        reference_range="25 - 35",
        units="%",
        min_value=25,
        max_value=35,
    ),
    RespiratoryParameter.PEAK_PRESSURE: ParameterInfo(
        display_name="Peak Pressure",
        reference_range="< 30",
        units="cmH2O",
        min_value=None,
        max_value=30,
    ),
    RespiratoryParameter.PLATEAU_PRESSURE: ParameterInfo(
        display_name="Plateau Pressure",
        reference_range="< 30",
        units="cmH2O",
        min_value=None,
        max_value=30,
    ),
    RespiratoryParameter.REMARKS: ParameterInfo(
        display_name="Remarks",
        reference_range=None,
        units=None,
        min_value=None,
        max_value=None,
    ),
}


# Catheter Parameters
class CatheterType(str, Enum):
    """Catheter Type"""
    # Central Venous Catheters
    CENTRAL_LINE = "Central line"
    SUBCLAVIAN_RT_OR_LT = "Subclavian Rt or Lt"
    INTERNAL_JUGULAR_RT_OR_LT = "Internal jugular Rt or Lt"
    FEMORAL_RT_OR_LT = "Femoral Rt or Lt"
    INTERNAL_JUGULAR_RT_OR_LT_LOWER = "Internal jugular rt or lt"
    # FEMORAL_RT_OR_LT_LOWER = "Femoral rt or lt"
    CVC_PERIPHERAL_LINE = "CVC / Peripheral line"
    RYLES_TUBE = "Ryles Tube"

    
    # Arterial Catheters
    ARTERIAL_LINE = "Arterial Line"
    RADIAL_RT_OR_LT = "Radial Rt or Lt"
    FEMORAL_ARTERIAL = "Femoral"
    ART_LINE_RADIAL = "Art Line Radial"
    
    # Dialysis Catheters
    DIALYSIS_CATHETER = "Dialysis catheter"
    
    # Urinary Catheters
    FOLEYS_CATHETER = "Foley's catheter"
    URINARY_CATHETER = "Urinary Catheter"
    
    # Peripheral Lines
    PERIPHERAL_LINE = "Peripheral line"
    
    # Respiratory
    ET_TUBE = "ET Tube"
    TRACHEOSTOMY_TUBE = "Tracheostomy Tube"
    # Legacy combined value still present in some patient_catheters docs
    ET_TRACHEOSTOMY_TUBE = "ET / Tracheostomy Tube"
    VENTILATOR_TUBING = "Ventilator Tubing"
    
    # Cardiovascular
    SHEATH = "Sheath"
    TEMP_PACING_LEAD = "Temp. Pacing Lead"
    PA_CATHETER = "PA Catheter"
    IABP = "IABP"
    
    # Equipment
    HUMIDIFIER = "Humidifier"


class CatheterCategoryType(str, Enum):
    """Catheter Category Type"""
    
    TYPE1 = "Type1"
    TYPE2 = "Type2"


CATHETER_PARAMETER_INFO: Dict[CatheterType, ParameterInfo] = {
    # Central Venous Catheters
    CatheterType.CENTRAL_LINE: ParameterInfo(
        display_name="Central line",
        reference_range="Insertion duration ≤ 14 days",
        units="days",
        min_value=0,
        max_value=14,
    ),
    CatheterType.RYLES_TUBE: ParameterInfo(
        display_name="Ryles Tube",
        reference_range=None,
        units="days",
        min_value=None,
        max_value=None,
    ),
    CatheterType.SUBCLAVIAN_RT_OR_LT: ParameterInfo(
        display_name="Subclavian Rt or Lt",
        reference_range="Insertion duration ≤ 14 days",
        units="days",
        min_value=0,
        max_value=14,
    ),
    CatheterType.INTERNAL_JUGULAR_RT_OR_LT: ParameterInfo(
        display_name="Internal jugular Rt or Lt",
        reference_range="Insertion duration ≤ 14 days",
        units="days",
        min_value=0,
        max_value=14,
    ),
    CatheterType.FEMORAL_RT_OR_LT: ParameterInfo(
        display_name="Femoral Rt or Lt",
        reference_range="Insertion duration ≤ 14 days",
        units="days",
        min_value=0,
        max_value=14,
    ),
    CatheterType.INTERNAL_JUGULAR_RT_OR_LT_LOWER: ParameterInfo(
        display_name="Internal jugular rt or lt",
        reference_range="Insertion duration ≤ 14 days",
        units="days",
        min_value=0,
        max_value=14,
    ),
    # CatheterType.FEMORAL_RT_OR_LT_LOWER: ParameterInfo(
    #     display_name="Femoral rt or lt",
    #     reference_range="Insertion duration ≤ 14 days",
    #     units="days",
    #     min_value=0,
    #     max_value=14,
    # ),
    CatheterType.CVC_PERIPHERAL_LINE: ParameterInfo(
        display_name="CVC / Peripheral line",
        reference_range="Insertion duration ≤ 14 days",
        units="days",
        min_value=0,
        max_value=14,
    ),
    
    # Arterial Catheters
    CatheterType.ARTERIAL_LINE: ParameterInfo(
        display_name="Arterial Line",
        reference_range="Insertion duration ≤ 5 days",
        units="days",
        min_value=0,
        max_value=5,
    ),
    CatheterType.RADIAL_RT_OR_LT: ParameterInfo(
        display_name="Radial Rt or Lt",
        reference_range="Insertion duration ≤ 5 days",
        units="days",
        min_value=0,
        max_value=5,
    ),
    CatheterType.FEMORAL_ARTERIAL: ParameterInfo(
        display_name="Femoral",
        reference_range="Insertion duration ≤ 5 days",
        units="days",
        min_value=0,
        max_value=5,
    ),
    CatheterType.ART_LINE_RADIAL: ParameterInfo(
        display_name="Art Line Radial",
        reference_range="Insertion duration ≤ 5 days",
        units="days",
        min_value=0,
        max_value=5,
    ),
    
    # Dialysis Catheters
    CatheterType.DIALYSIS_CATHETER: ParameterInfo(
        display_name="Dialysis catheter",
        reference_range="Insertion duration ≤ 7 days",
        units="days",
        min_value=0,
        max_value=7,
    ),
    
    # Urinary Catheters
    CatheterType.FOLEYS_CATHETER: ParameterInfo(
        display_name="Foley's catheter",
        reference_range="Insertion duration ≤ 14 days",
        units="days",
        min_value=0,
        max_value=14,
    ),
    CatheterType.URINARY_CATHETER: ParameterInfo(
        display_name="Urinary Catheter",
        reference_range="Insertion duration ≤ 14 days",
        units="days",
        min_value=0,
        max_value=14,
    ),
    
    # Peripheral Lines
    CatheterType.PERIPHERAL_LINE: ParameterInfo(
        display_name="Peripheral line",
        reference_range="Insertion duration ≤ 72 hours",
        units="hours",
        min_value=0,
        max_value=72,
    ),
    
    # Respiratory
    CatheterType.ET_TUBE: ParameterInfo(
        display_name="ET Tube",
        reference_range="As needed for ventilation",
        units="days",
        min_value=0,
        max_value=None,
    ),
    CatheterType.TRACHEOSTOMY_TUBE: ParameterInfo(
        display_name="Tracheostomy Tube",
        reference_range="As needed for ventilation",
        units="days",
        min_value=0,
        max_value=None,
    ),
    CatheterType.ET_TRACHEOSTOMY_TUBE: ParameterInfo(
        display_name="ET / Tracheostomy Tube",
        reference_range="As needed for ventilation",
        units="days",
        min_value=0,
        max_value=None,
    ),
    CatheterType.VENTILATOR_TUBING: ParameterInfo(
        display_name="Ventilator Tubing",
        reference_range="Change every 48-72 hours",
        units="hours",
        min_value=0,
        max_value=72,
    ),
    
    # Cardiovascular
    CatheterType.SHEATH: ParameterInfo(
        display_name="Sheath",
        reference_range="Remove when procedure complete",
        units="hours",
        min_value=0,
        max_value=24,
    ),
    CatheterType.TEMP_PACING_LEAD: ParameterInfo(
        display_name="Temp. Pacing Lead",
        reference_range="Temporary use only",
        units="days",
        min_value=0,
        max_value=7,
    ),
    CatheterType.PA_CATHETER: ParameterInfo(
        display_name="PA Catheter",
        reference_range="Insertion duration ≤ 5 days",
        units="days",
        min_value=0,
        max_value=5,
    ),
    CatheterType.IABP: ParameterInfo(
        display_name="IABP",
        reference_range="As needed for hemodynamic support",
        units="days",
        min_value=0,
        max_value=7,
    ),
    
    # Equipment
    CatheterType.HUMIDIFIER: ParameterInfo(
        display_name="Humidifier",
        reference_range="Change daily",
        units="days",
        min_value=0,
        max_value=1,
    ),
}


def get_parameter_info(parameter: Enum) -> Optional[ParameterInfo]:
    """Get parameter information from any type of parameter"""
    if isinstance(parameter, BloodAnalysisParameter):
        return BLOOD_PARAMETER_INFO.get(parameter)
    elif isinstance(parameter, ArterialAnalysisParameter):
        return ARTERIAL_PARAMETER_INFO.get(parameter)
    elif isinstance(parameter, MicrobiologyParameter):
        return MICROBIOLOGY_PARAMETER_INFO.get(parameter)
    elif isinstance(parameter, GCSParameter):
        return GCS_PARAMETER_INFO.get(parameter)
    elif isinstance(parameter, InfusionParameter):
        return INFUSION_PARAMETER_INFO.get(parameter)
    elif isinstance(parameter, IntakeType):
        return INTAKE_PARAMETER_INFO.get(parameter)
    elif isinstance(parameter, VitalParameter):
        return VITAL_PARAMETER_INFO.get(parameter)
    elif isinstance(parameter, BloodGasParameter):
        return BLOOD_GAS_PARAMETER_INFO.get(parameter)
    elif isinstance(parameter, RespiratoryParameter):
        return RESPIRATORY_PARAMETER_INFO.get(parameter)
    elif isinstance(parameter, CatheterType):
        return CATHETER_PARAMETER_INFO.get(parameter)
    return None
