from enum import Enum

class Formality(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"

class Detail(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"

class LanguageComplexity(Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"

class Style(Enum):
    ACADEMIC = "academic"
    TECHNICAL = "technical"
    NON_TECHNICAL = "non-technical"

class PodcastType(Enum):
    CONVERSATIONAL = "conversational"
    NARRATIVE = "narrative"

class Perspective(Enum):
    SUBJECTIVE = "subjective"
    NEUTRAL = "neutral"

PARAMETERS = [
    ("formality", "formality level", Formality),
    ("detail", "detail level", Detail),
    ("language_complexity", "language complexity", LanguageComplexity),
    ("style", "style", Style),
    ("podcast_type", "podcast type", PodcastType),
]

class CustomizationConfig:

    def __init__(self, params):
        assert type(params) == dict
        for k, v in params.items():
            param_def = next((v for v in PARAMETERS if v[0] == k), None)
            assert param_def is not None
            assert type(v) == dict
            assert len(v) == 2
            assert 'label' in v
            assert v['label'] == param_def[1]
            assert 'value' in v
            assert type(v['value']) == param_def[2]
        self.params = params

    def to_name_value_dict(self):
        return { name: v['value'].value for name, v in self.params.items() }
    
    def to_label_value_dict(self):
        return { v['label']: v['value'].value for _, v in self.params.items() }

    @classmethod
    def from_sanic_body(cls, body):
        params = { name: {"label": label, "value": getattr(body, name)} for name, label, _ in PARAMETERS if name in body.__class__.model_fields }
        return cls(params)