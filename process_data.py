import pandas as pd
import json
import math

try:
    file_path = "c:/Users/SEDUC/Desktop/PROJETOS/ESOCIAL/S-1202_0098406_00001.xlsx"
    print(f"Reading {file_path}...")
    df = pd.read_excel(file_path)
    
    # Drop rows where URE.1 is completely empty
    df = df.dropna(subset=['URE.1'])
    
    def clean_val(v):
        if pd.isna(v):
            return ""
        if isinstance(v, float) and math.isnan(v):
            return ""
        return str(v).strip()

    data_by_ure = {}
    
    for _, row in df.iterrows():
        dependente_val = clean_val(row.get('DEPENDENTE'))
        
        # O usuário quer que APENAS os que têm alguma coisa escrita em 'DEPENDENTE' entrem no sistema.
        # Se for vazio, significa que não tem pendência, então não entra.
        if not dependente_val or dependente_val.lower() == 'nan':
            continue
            
        ure_name = clean_val(row.get('URE.1', ''))
        if not ure_name:
            continue
            
        if ure_name not in data_by_ure:
            data_by_ure[ure_name] = {
                "name": ure_name,
                "servidores": []
            }
            
        servidor = {
            "nome": clean_val(row.get('NOME')),
            "cpf": clean_val(row.get('CPF.1')),
            "matricula": clean_val(row.get('NUMFUNC')),
            "vinculo": clean_val(row.get('NUMVINC')),
            "cargo": clean_val(row.get('CARGO')) + " - " + clean_val(row.get('NOME_CARGO')),
            "setor": clean_val(row.get('NOMESETOR')),
            "cidade": clean_val(row.get('CIDADE')),
            "dependente": dependente_val,
            "pendente": True
        }
        
        data_by_ure[ure_name]["servidores"].append(servidor)
        
    output_path = "c:/Users/SEDUC/Desktop/PROJETOS/ESOCIAL/data.json"
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(list(data_by_ure.values()), f, ensure_ascii=False, indent=2)
        
    print(f"Successfully processed {len(data_by_ure)} UREs and saved to {output_path}")

except Exception as e:
    print(f"Error: {e}")
