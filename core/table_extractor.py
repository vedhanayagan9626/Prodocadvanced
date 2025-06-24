import pandas as pd
from collections import defaultdict

def cluster_lines_by_y(ocr_data, y_threshold=10):
    lines = defaultdict(list)
    sorted_items = sorted(ocr_data, key=lambda x: x['bbox'][0][1])
    current_y = None
    line_index = -1
    for item in sorted_items:
        y = item['bbox'][0][1]
        if current_y is None or abs(y - current_y) > y_threshold:
            line_index += 1
            current_y = y
        lines[line_index].append(item)
    return list(lines.values())

def is_header_line(text, expected_keywords):
    match_count = sum(1 for word in expected_keywords if word.lower() in text.lower())
    return match_count >= max(2, len(expected_keywords) // 2)  # threshold logic

def reconstruct_table(ocr_data, template):
    start_keywords = template['table'].get('header_keywords', [])
    end_keywords = template['table'].get('end_keywords', ['taxable amount'])

    header_found = False
    header_line_items = []
    lines = cluster_lines_by_y(ocr_data)

    table_rows = []

    for line_items in lines:
        line_text = " ".join([item['text'] for item in line_items])

        if not header_found and is_header_line(line_text, start_keywords):
            header_found = True
            header_line_items = sorted(line_items, key=lambda x: x['bbox'][0][0])
            continue

        if header_found:
            sorted_line = sorted(line_items, key=lambda x: x['bbox'][0][0])
            row = [item['text'] for item in sorted_line]
            table_rows.append(row)

            if any(end_kw.lower() in item['text'].lower() for item in sorted_line for end_kw in end_keywords):
                break

    column_count = len(header_line_items)
    normalized_rows = []
    for row in table_rows:
        if len(row) < column_count:
            row.extend([''] * (column_count - len(row)))
        elif len(row) > column_count:
            row = row[:column_count]
        normalized_rows.append(row)

    column_names = [item['text'] for item in header_line_items]
    return pd.DataFrame(normalized_rows, columns=column_names)
