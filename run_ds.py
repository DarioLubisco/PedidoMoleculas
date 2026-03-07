import sys
from pathlib import Path

# Add the scripts directory to path
skill_path = Path(r"C:\Users\DARIO LUBISCO\.gemini\antigravity\skills\ui-ux-pro-max-skill\scripts")
sys.path.append(str(skill_path))

try:
    from design_system import generate_design_system
    
    query = "laboratory b2b ordering dashboard data processing professional minimalist"
    project = "Pedido Moleculas"
    
    result = generate_design_system(query, project, output_format="markdown")
    
    with open("ds_result.md", "w", encoding="utf-8") as f:
        f.write(result)
    print("SUCCESS: Result written to ds_result.md")
except Exception as e:
    print(f"ERROR: {str(e)}")
    import traceback
    traceback.print_exc()
