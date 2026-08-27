import pandas as pd
import re
import math

def clean_cpf(val):
    if pd.isna(val):
        return ""
    if isinstance(val, float) and math.isnan(val):
        return ""
    # Convert float like 1234.0 to "1234"
    if isinstance(val, float):
        val = str(int(val))
    val = str(val)
    val = re.sub(r'\D', '', val) # remove non-digits
    return val

def clean_name(val):
    if pd.isna(val):
        return ""
    return str(val).strip().upper()

print("Lendo Dados Segurados...")
df_segurados = pd.read_excel('Dados Segurados SEDUC 24082026 (1).xlsx')

# Build mapping
# titular_cpf -> list of {name, cpf}
mapping = {}
current_titular_cpf = ""

for _, row in df_segurados.iterrows():
    tipo = str(row.get('TIPO', '')).strip().upper()
    nome = clean_name(row.get('SEGURADO'))
    cpf = clean_cpf(row.get('CPF'))
    
    if tipo == 'TITULAR':
        current_titular_cpf = cpf
    elif tipo == 'DEPENDENTE':
        if current_titular_cpf:
            if current_titular_cpf not in mapping:
                mapping[current_titular_cpf] = []
            if cpf: # only if dependent has a cpf
                mapping[current_titular_cpf].append({
                    'name': nome,
                    'cpf': cpf
                })

print(f"Mapeados {len(mapping)} titulares com dependentes a partir da planilha de segurados.")

print("Lendo base do eSocial (S-1202)...")
df_s1202 = pd.read_excel('S-1202_0098406_00001 (2).xlsx')

results = []

for _, row in df_s1202.iterrows():
    dependente_str = row.get('DEPENDENTE')
    if pd.isna(dependente_str):
        continue
    
    dependente_str = str(dependente_str).upper()
    # Filter only those that actually mention dependents
    if "NENHUM" in dependente_str or len(dependente_str.strip()) < 5:
        continue
        
    titular_nome = clean_name(row.get('NOME'))
    titular_cpf = clean_cpf(row.get('CPF.1'))
    
    if titular_cpf in mapping:
        deps = mapping[titular_cpf]
        for dep in deps:
            # Check if dependent name is in the dependente string (fuzzy or exact)
            # Sometimes names have extra spaces or slight differences. Let's do a simple substring check.
            dep_name = dep['name']
            
            # Substring exact check
            match = dep_name in dependente_str
            
            # If not exact match, maybe check first and last name? Let's just output it anyway.
            # We want to know if we found CPFs for this titular's dependents.
            
            results.append({
                'NOME TITULAR': titular_nome,
                'CPF TITULAR': titular_cpf,
                'NOME DEPENDENTE (SEGURADOS)': dep_name,
                'CPF DEPENDENTE ENCONTRADO': dep['cpf'],
                'TEXTO ORIGINAL ESOCIAL': dependente_str,
                'CORRESPONDÊNCIA EXATA DE NOME': 'SIM' if match else 'NÃO'
            })
            
print(f"Gerando resultados... {len(results)} cruzamentos encontrados.")

df_results = pd.DataFrame(results)
output_file = 'resultado_cruzamento_cpfs.xlsx'
df_results.to_excel(output_file, index=False)
print(f"Planilha gerada com sucesso em: {output_file}")
