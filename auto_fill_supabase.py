import pandas as pd
import requests
import json
from datetime import datetime

print("Carregando S-1202...")
df_s1202 = pd.read_excel('S-1202_0098406_00001 (2).xlsx')
df_s1202 = df_s1202.dropna(subset=['URE.1'])
pendentes = df_s1202[df_s1202['DEPENDENTE'].notna()]
pendentes = pendentes[pendentes['DEPENDENTE'].astype(str).str.strip() != 'nan']
pendentes = pendentes[pendentes['DEPENDENTE'].astype(str).str.strip() != '']

titular_info = {}
for _, row in pendentes.iterrows():
    cpf_raw = str(row.get('CPF.1')).replace('.0', '').strip()
    cpf_cln = ''.join(filter(str.isdigit, cpf_raw))
    if cpf_cln:
        titular_info[cpf_cln] = {
            'nome': row.get('NOME'),
            'ure': row.get('URE.1')
        }

print("Carregando Dados Segurados...")
df_segurados = pd.read_excel('Dados Segurados SEDUC 24082026 (1).xlsx')

def format_cpf(cpf):
    cpf = str(cpf).replace('.0', '').strip()
    cpf = ''.join(filter(str.isdigit, cpf)).zfill(11)
    return f"{cpf[:3]}.{cpf[3:6]}.{cpf[6:9]}-{cpf[9:]}"

current_titular = ''
records_to_insert = []
current_deps = []

for _, row in df_segurados.iterrows():
    tipo = str(row.get('TIPO', '')).strip().upper()
    if tipo == 'TITULAR':
        # Flush previous
        if current_titular and current_titular in titular_info and len(current_deps) > 0:
            info = titular_info[current_titular]
            records_to_insert.append({
                "nome": info['nome'],
                "cpf": current_titular,
                "ure": info['ure'],
                "dependentes": json.dumps(current_deps, ensure_ascii=False),
                "observacoes": "Preenchido automaticamente via cruzamento de dados (Base de Segurados)",
                "atualizado_em": datetime.utcnow().isoformat()
            })
        
        cpf_raw = str(row.get('CPF')).replace('.0', '').strip()
        current_titular = ''.join(filter(str.isdigit, cpf_raw))
        current_deps = []
        
    elif tipo == 'DEPENDENTE':
        cpf_dep = row.get('CPF')
        if pd.notna(cpf_dep) and str(cpf_dep).strip() != '':
            rel = row.get('RELACIONAMENTO')
            current_deps.append({
                "nome": row.get('SEGURADO'),
                "cpf": format_cpf(cpf_dep),
                "data_nascimento": "",
                "parentesco": rel if pd.notna(rel) else "Não informado"
            })

# Flush last
if current_titular and current_titular in titular_info and len(current_deps) > 0:
    info = titular_info[current_titular]
    records_to_insert.append({
        "nome": info['nome'],
        "cpf": current_titular,
        "ure": info['ure'],
        "dependentes": json.dumps(current_deps, ensure_ascii=False),
        "observacoes": "Preenchido automaticamente via cruzamento de dados (Base de Segurados)",
        "atualizado_em": datetime.utcnow().isoformat()
    })

print(f"Preparados {len(records_to_insert)} registros para inserir no Supabase.")

supabase_url = 'https://ldmuedmayykjofujfdmh.supabase.co/rest/v1/servidores_atualizacao'
headers = {
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkbXVlZG1heXlram9mdWpmZG1oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc0MjYxMDIsImV4cCI6MjEwMzAwMjEwMn0.ndE4g36nNiBMkNjRcifGQasEz9deRjYtg338Y_54m1k',
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkbXVlZG1heXlram9mdWpmZG1oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc0MjYxMDIsImV4cCI6MjEwMzAwMjEwMn0.ndE4g36nNiBMkNjRcifGQasEz9deRjYtg338Y_54m1k',
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal'
}

chunk_size = 500
total_inserted = 0
for i in range(0, len(records_to_insert), chunk_size):
    chunk = records_to_insert[i:i+chunk_size]
    response = requests.post(supabase_url, headers=headers, data=json.dumps(chunk))
    if response.status_code in (200, 201):
        total_inserted += len(chunk)
        print(f"Inseridos {len(chunk)} registros com sucesso.")
    else:
        print(f"Erro ao inserir chunk: {response.text}")

print(f"Finalizado! Total inserido: {total_inserted}")
