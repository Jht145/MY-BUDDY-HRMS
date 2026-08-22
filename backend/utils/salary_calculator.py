import json
from typing import Dict, Any, Optional

def compute_salary_breakdown(
    monthly_wage: float,
    basic_pct: float = 0.50,
    hra_pct: float = 0.50,
    standard_allowance_pct: float = 0.05,
    performance_bonus_pct: float = 0.05,
    lta_pct: float = 0.05,
    pf_pct: float = 0.12,
    professional_tax: float = 200.00
) -> Dict[str, Any]:
    """
    Phase 2: Backend Calculation Engine (FastAPI)
    Auto-computes the entire structure when an Admin submits a new 'Monthly Wage'.

    Step 1: Calculate Basic: Wage * 50%
    Step 2: Calculate HRA: Basic * 50%
    Step 3: Calculate percentage-based allowances (Standard, Performance, LTA).
    Step 4: Calculate Fixed Allowance: Wage - (Basic + HRA + Standard + Performance + LTA)
    Step 5: Calculate Deductions: PF (Basic * 12%) and PT (Fixed 200).
    Step 6: Calculate Net Salary: Wage - (PF + PT).
    """
    wage = round(float(monthly_wage), 2)

    # Step 1: Calculate Basic: Wage * 50%
    basic_salary = round(wage * basic_pct, 2)

    # Step 2: Calculate HRA: Basic * 50%
    hra = round(basic_salary * hra_pct, 2)

    # Step 3: Calculate percentage-based allowances (Standard, Performance, LTA)
    standard_allowance = round(wage * standard_allowance_pct, 2)
    performance_bonus = round(wage * performance_bonus_pct, 2)
    lta = round(wage * lta_pct, 2)

    # Step 4: Calculate Fixed Allowance: Wage - (Basic + HRA + Standard + Performance + LTA)
    sum_allocated = basic_salary + hra + standard_allowance + performance_bonus + lta
    fixed_allowance = round(wage - sum_allocated, 2)

    # Step 5: Calculate Deductions: PF (Basic * 12%) and PT (Fixed 200)
    pf_employee = round(basic_salary * pf_pct, 2)
    pf_employer = round(basic_salary * pf_pct, 2)
    pt = float(professional_tax)

    # Aggregated Summary Fields for backward compatibility
    total_allowances = round(hra + standard_allowance + performance_bonus + lta + fixed_allowance, 2)
    total_deductions = round(pf_employee + pt, 2)

    # Step 6: Calculate Net Salary: Wage - (PF + PT)
    net_salary = round(wage - (pf_employee + pt), 2)

    config = {
        "basic_pct": basic_pct,
        "hra_pct": hra_pct,
        "standard_allowance_pct": standard_allowance_pct,
        "performance_bonus_pct": performance_bonus_pct,
        "lta_pct": lta_pct,
        "pf_pct": pf_pct,
        "professional_tax": pt
    }

    return {
        "monthly_wage": wage,
        "basic_salary": basic_salary,
        "hra": hra,
        "standard_allowance": standard_allowance,
        "performance_bonus": performance_bonus,
        "lta": lta,
        "fixed_allowance": fixed_allowance,
        "pf_employee": pf_employee,
        "pf_employer": pf_employer,
        "professional_tax": pt,
        "salary_base": wage,
        "salary_allowances": total_allowances,
        "salary_deductions": total_deductions,
        "net_salary": net_salary,
        "salary_config": json.dumps(config)
    }
