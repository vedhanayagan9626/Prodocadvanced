import re

def extract_fields(text, template):
    fields = {}

    for key, rule in template.get("fields", {}).items():
        # Handle multi-line fields (e.g., address)
        if isinstance(rule, dict) and rule.get("method") == "below":
            for i, line in enumerate(text.splitlines()):
                if re.search(rule["key"], line):
                    value_lines = []
                    for j in range(i + 1, len(text.splitlines())):
                        if re.search(rule["stop"], text.splitlines()[j]):
                            break
                        value_lines.append(text.splitlines()[j].strip())
                    fields[key] = " ".join(value_lines).strip()
                    break
        else:
            if isinstance(rule, str):
                match = re.search(rule, text)
                if match:
                    fields[key] = match.group(1).strip()
                else:
                    fields[key] = ""  # handle missing data if needed
            else:
                fields[key] = ""  # handle unexpected rule type

    return fields
