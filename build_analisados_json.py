import pandas as pd
import json
import math

print("Carregando BASE COM OS JÁ ANALISADOS...")
df_analisados = pd.read_excel('BASE COM OS JÁ  ANALISADOS.xlsx', header=None)

# Coluna 0 é Matrícula, Coluna 1 é Vínculo
analisados_keys = set()
for _, row in df_analisados.iterrows():
    mat = row[0]
    vinc = row[1]
    
    if pd.notna(mat):
        try:
            mat_str = str(int(float(mat)))
        except ValueError:
            mat_str = str(mat).strip()
            
        try:
            vinc_str = str(int(float(vinc))) if pd.notna(vinc) else ''
        except ValueError:
            vinc_str = str(vinc).strip() if pd.notna(vinc) else ''
            
        analisados_keys.add((mat_str, vinc_str))

print(f"Encontrados {len(analisados_keys)} registros únicos na base de analisados.")

print("Lendo data.json para buscar CPFs correspondentes...")
with open('frontend/public/data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

cpfs_analisados = set()

for ure in data:
    for s in ure['servidores']:
        mat_s = str(s.get('matricula', '')).strip()
        vinc_s = str(s.get('vinculo', '')).strip()
        
        # O CPF base é gravado como float ex: 1234.0, precisamos limpar
        cpf_raw = str(s.get('cpf', ''))
        cpf_clean = cpf_raw.replace('.0', '').strip()
        cpf_clean = ''.join(filter(str.isdigit, cpf_clean))
        
        if (mat_s, vinc_s) in analisados_keys or (mat_s, '') in analisados_keys:
            if cpf_clean:
                cpfs_analisados.add(cpf_clean)

print(f"Mapeados {len(cpfs_analisados)} CPFs únicos para Analisados.")

out_file = 'frontend/public/analisados.json'
with open(out_file, 'w', encoding='utf-8') as f:
    json.dump(list(cpfs_analisados), f)

print(f"Arquivo {out_file} gerado com sucesso!")
