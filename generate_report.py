import requests
import json
import pandas as pd
import math

# 1. Fetch from Supabase
supabase_url = 'https://ldmuedmayykjofujfdmh.supabase.co/rest/v1/servidores_atualizacao?select=*'
headers = {
    'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkbXVlZG1heXlram9mdWpmZG1oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc0MjYxMDIsImV4cCI6MjEwMzAwMjEwMn0.ndE4g36nNiBMkNjRcifGQasEz9deRjYtg338Y_54m1k',
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxkbXVlZG1heXlram9mdWpmZG1oIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc0MjYxMDIsImV4cCI6MjEwMzAwMjEwMn0.ndE4g36nNiBMkNjRcifGQasEz9deRjYtg338Y_54m1k'
}

supabase_data = []
offset = 0
limit = 1000

while True:
    url = f"{supabase_url}&offset={offset}&limit={limit}"
    response = requests.get(url, headers=headers)
    if response.status_code != 200:
        print(f"Error fetching from Supabase: {response.text}")
        exit(1)
        
    data = response.json()
    supabase_data.extend(data)
    
    if len(data) < limit:
        break
    offset += limit

print(f"Fetched {len(supabase_data)} records from Supabase.")

# 2. Load data.json for DRE
with open('frontend/public/data.json', 'r', encoding='utf-8') as f:
    json_data = json.load(f)

# Map CPF to DRE
cpf_to_dre = {}
for ure in json_data:
    for servidor in ure.get('servidores', []):
        cpf = str(servidor.get('cpf')).replace('.0', '').strip()
        dre = servidor.get('numero_dre')
        if cpf:
            cpf_to_dre[cpf] = dre

# 3. Combine data
report_data = []
for record in supabase_data:
    cpf = str(record.get('cpf')).replace('.0', '').strip()
    dre = cpf_to_dre.get(cpf, 'Não encontrado')
    
    report_data.append({
        'NOME': record.get('nome'),
        'CPF': cpf,
        'URE': record.get('ure'),
        'NUM DRE': dre,
        'DEPENDENTES (RESPOSTA)': record.get('dependentes'),
        'OBSERVACOES': record.get('observacoes'),
        'DATA DE ATUALIZACAO': record.get('atualizado_em')
    })

# 4. Generate Excel
df = pd.DataFrame(report_data)
output_path = 'relatorio_respostas.xlsx'
df.to_excel(output_path, index=False)
print(f"Spreadsheet generated successfully at {output_path}")
