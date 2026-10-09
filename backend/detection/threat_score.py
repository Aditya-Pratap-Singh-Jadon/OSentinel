def calculate_threat_score(cpu_percent, memory_percent, consecutive_high_cpu, consecutive_high_memory):
    score = 0
    
    if consecutive_high_cpu >= 3:
        # Scale score based on severity of cpu usage and duration
        score += min(50, consecutive_high_cpu * 10 + (cpu_percent - 90) * 0.5)
    
    if consecutive_high_memory >= 3:
        score += min(50, consecutive_high_memory * 10 + (memory_percent - 80) * 0.5)
        
    return max(0, min(100, int(score)))

def get_severity(score):
    if score <= 30:
        return "LOW"
    elif score <= 60:
        return "MEDIUM"
    elif score <= 80:
        return "HIGH"
    else:
        return "CRITICAL"
