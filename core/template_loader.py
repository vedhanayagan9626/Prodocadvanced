# template loader
import os
import yaml , re
from core.config import YML_TEMPLATE_DIR
def load_templates(template_dir= YML_TEMPLATE_DIR):
    templates = []
    for filename in os.listdir(template_dir):
        if filename.endswith('.yml'):
            with open(os.path.join(template_dir, filename)) as f:
                templates.append(yaml.safe_load(f))
    return templates

def keyword_to_regex(keyword):
    # Split on whitespace, join with a pattern that matches any spaces/symbols
    words = keyword.split()
    pattern = r"[\s\W_]*".join(map(re.escape, words))
    return pattern

def detect_template(text, templates):
    text_lower = text.lower()
    for tpl in templates:
        # All keywords must match (using regex)
        all_match = True
        if tpl.get('vendor')== 'Satrun Technologies':
            # Special case for Satrun Technologies
            match_count = 0

            for keyword in tpl['keywords']:
                pattern = keyword_to_regex(keyword.lower())
                if re.search(pattern, text_lower, re.IGNORECASE):
                    match_count += 1
                    if match_count >= 2:
                        return tpl

        else:
            for keyword in tpl['keywords']:
                pattern = keyword_to_regex(keyword.lower())
                if not re.search(pattern, text_lower, re.IGNORECASE):
                    all_match = False
                    break
            if all_match:
                return tpl
    return None