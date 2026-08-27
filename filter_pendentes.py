import pandas as pd
import math

print("Lendo a base principal (S-1202) para pegar os CPFs pendentes...")
df_s1202 = pd.read_excel('S-1202_0098406_00001 (2).xlsx')
df_s1202 = df_s1202.dropna(subset=['URE.1'])
# Filtra quem tem algo preenchido em DEPENDENTE
pendentes = df_s1202[df_s1202['DEPENDENTE'].notna()]
pendentes = pendentes[pendentes['DEPENDENTE'].astype(str).str.strip() != 'nan']
pendentes = pendentes[pendentes['DEPENDENTE'].astype(str).str.strip() != '']

# Limpa e extrai CPFs pendentes
cpfs_pendentes = set(
    pendentes['CPF.1']
    .dropna()
    .astype(str)
    .str.replace(r'\.0$', '', regex=True)
    .str.replace(r'\D', '', regex=True)
    .unique()
)

print(f"Total de CPFs únicos pendentes na base S-1202: {len(cpfs_pendentes)}")

print("Lendo a nova planilha de Segurados...")
df_segurados = pd.read_excel('Dados Segurados SEDUC 24082026 (1).xlsx')
df_segurados['CPF_CLN'] = df_segurados['CPF'].astype(str).str.replace(r'\.0$', '', regex=True).str.replace(r'\D', '', regex=True)
df_segurados['TIPO'] = df_segurados['TIPO'].astype(str).str.strip().str.upper()

current_titular = ''
mapping_titular_cpf = []

# Mapeia qual é o CPF do titular para cada linha (incluindo dependentes)
for _, row in df_segurados.iterrows():
    if row['TIPO'] == 'TITULAR':
        current_titular = row['CPF_CLN']
        mapping_titular_cpf.append(current_titular)
    elif row['TIPO'] == 'DEPENDENTE':
        mapping_titular_cpf.append(current_titular)
    else:
        mapping_titular_cpf.append('')

df_segurados['TITULAR_CPF_VINCULADO'] = mapping_titular_cpf

# Filtra apenas as linhas cujo TITULAR_CPF_VINCULADO esteja na nossa lista de CPFs pendentes
df_filtrado = df_segurados[df_segurados['TITULAR_CPF_VINCULADO'].isin(cpfs_pendentes)]

# Drop as colunas temporárias para não sujar a planilha
df_filtrado = df_filtrado.drop(columns=['CPF_CLN', 'TITULAR_CPF_VINCULADO'])

df_filtrado.to_excel('dados_segurados_filtrados_pendentes.xlsx', index=False)

n_serv = df_filtrado[df_filtrado['TIPO'] == 'TITULAR']['CPF'].nunique()
n_dep = len(df_filtrado[df_filtrado['TIPO'] == 'DEPENDENTE'])

print(f'Servidores unicos filtrados (encontrados em Segurados): {n_serv}')
print(f'Total de dependentes associados a eles: {n_dep}')
