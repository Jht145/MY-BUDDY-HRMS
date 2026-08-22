files = ['src/components/dashboard/AdminPayrollTab.tsx', 'src/components/dashboard/EmployeePayslipTab.tsx']
for f in files:
    with open(f, 'r', encoding='utf-8') as file:
        content = file.read()
    content = content.replace("fetch('/api", "fetch('http://localhost:8000/api")
    content = content.replace("fetch(\/api", "fetch(\http://localhost:8000/api")
    with open(f, 'w', encoding='utf-8') as file:
        file.write(content)
print("Done")
