import re

with open('frontend/src/pages/Dashboard.jsx', 'r', encoding='utf-8') as f:
    text = f.read()

# Remove import
text = re.sub(r'import \* as XLSX from \'xlsx\'\n', '', text)

# Remove export state variables
text = re.sub(r'  const \[exportModalOpen, setExportModalOpen\] = useState\(false\)\n\s*// Export selections\n  const \[exportUres, setExportUres\] = useState\(\[\]\)\n  const \[exportCpfs, setExportCpfs\] = useState\(\[\]\)\n  const \[expandedExportUres, setExpandedExportUres\] = useState\(\[\]\)\n', '', text)

# Remove Export Logic
text = re.sub(r'  // Export Logic\n  const toggleExportUre.*?setExportModalOpen\(false\);\n  }\n', '', text, flags=re.DOTALL)

# Remove Sidebar Button
button_pattern = r'          <button \n            className="btn btn-primary" \n            style=\{\{ width: \'100%\', marginBottom: \'1.5rem\', display: \'flex\', justifyContent: \'center\', backgroundColor: \'#10b981\' \}\}\n            onClick=\{\(\) => setExportModalOpen\(true\)\}\n          >\n            <FileSpreadsheet size=\{16\} /> Gerar Planilha\n          </button>\n\n'
text = re.sub(button_pattern, '', text)

# Remove Export Modal JSX
modal_pattern = r'      \{\/\* Export Modal \*\/}.*?\}\)\}\n'
text = re.sub(modal_pattern, '', text, flags=re.DOTALL)

with open('frontend/src/pages/Dashboard.jsx', 'w', encoding='utf-8') as f:
    f.write(text)
print('Done!')
