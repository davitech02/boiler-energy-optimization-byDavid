from flask import Flask, send_from_directory, request, jsonify
import plotly.express as px
import plotly.io as pio
import pandas as pd
import numpy as np
import json
import os

app = Flask(__name__)

def calculate_boiler_energy(feedwater_temp, steam_pressure, fuel_flow, efficiency):
    try:
        if not all(isinstance(x, (int, float)) for x in [feedwater_temp, steam_pressure, fuel_flow, efficiency]):
            raise ValueError("All inputs must be numeric")
        if fuel_flow <= 0 or efficiency <= 0 or efficiency > 100:
            raise ValueError("Invalid input: fuel_flow and efficiency must be positive, efficiency <= 100")
        
        HHV = 40  # MJ/kg (natural gas)
        cp_water = 4.18  # kJ/kg·°C
        h_vap = 2257  # kJ/kg (latent heat at 100°C)
        
        Q_in = fuel_flow * HHV
        T_steam = 100 + (steam_pressure - 1) * 10
        h_steam = cp_water * T_steam + h_vap
        h_feedwater = cp_water * feedwater_temp
        Q_out = efficiency / 100 * Q_in
        
        optimized_efficiency = min(efficiency + 10, 95)
        Q_in_optimized = Q_out / (optimized_efficiency / 100)
        savings = Q_in - Q_in_optimized
        
        return {
            "current_energy": float(Q_in),
            "output_energy": float(Q_out),
            "savings": float(savings),
            "optimized_efficiency": float(optimized_efficiency)
        }
    except Exception as e:
        print(f"Error in calculate_boiler_energy: {e}")
        raise

def sensitivity_analysis(feedwater_temp, steam_pressure, fuel_flow, efficiency):
    try:
        temps = np.linspace(feedwater_temp - 20, feedwater_temp + 20, 10)
        savings = []
        for temp in temps:
            result = calculate_boiler_energy(temp, steam_pressure, fuel_flow, efficiency)
            savings.append(result["savings"])
        
        df_sensitivity = pd.DataFrame({"Feedwater Temp (°C)": temps, "Savings (MJ/s)": savings})
        fig_sensitivity = px.line(df_sensitivity, x="Feedwater Temp (°C)", y="Savings (MJ/s)", title="Savings vs. Feedwater Temperature")
        fig_sensitivity.update_traces(line_color='#4682B4')
        fig_sensitivity.update_layout(hovermode='x unified')
        return pio.to_json(fig_sensitivity)
    except Exception as e:
        print(f"Error in sensitivity_analysis: {e}")
        raise

@app.route('/')
def index():
    try:
        static_path = os.path.join(app.root_path, 'static')
        index_path = os.path.join(static_path, 'index.html')
        print(f"Checking for index.html at: {index_path}")
        if not os.path.exists(index_path):
            templates_path = os.path.join(app.root_path, 'templates')
            index_path = os.path.join(templates_path, 'index.html')
            print(f"Fallback: Checking for index.html at: {index_path}")
            if not os.path.exists(index_path):
                print(f"Error: index.html not found in {static_path} or {templates_path}")
                return jsonify({"error": "index.html not found in static or templates folder"}), 404
            print(f"Serving index.html from {templates_path}")
            return send_from_directory(templates_path, 'index.html')
        print(f"Serving index.html from {static_path}")
        return send_from_directory(static_path, 'index.html')
    except Exception as e:
        print(f"Error serving index.html: {e}")
        return jsonify({"error": str(e)}), 404

@app.route('/api/optimize', methods=['POST'])
def optimize():
    try:
        data = request.get_json()
        if not data:
            raise ValueError("No JSON data provided")
        print("Received API data:", data)
        
        feedwater_temp = float(data.get('feedwater_temp', 80))
        steam_pressure = float(data.get('steam_pressure', 10))
        fuel_flow = float(data.get('fuel_flow', 0.5))
        efficiency = float(data.get('efficiency', 85))
        
        results = calculate_boiler_energy(feedwater_temp, steam_pressure, fuel_flow, efficiency)
        print("Calculation results:", results)
        
        df = pd.DataFrame({
            "Scenario": ["Current", "Optimized"],
            "Energy (MJ/s)": [results["current_energy"], results["current_energy"] - results["savings"]]
        })
        fig = px.bar(df, x="Scenario", y="Energy (MJ/s)", title="Energy Consumption")
        fig.update_traces(marker_color='#4682B4')
        fig.update_layout(hovermode='x unified')
        plot_json = json.loads(pio.to_json(fig))
        print("Energy chart JSON:", str(plot_json)[:200] + "...")
        
        sensitivity_json = json.loads(sensitivity_analysis(feedwater_temp, steam_pressure, fuel_flow, efficiency))
        print("Sensitivity chart JSON:", str(sensitivity_json)[:200] + "...")
        
        return jsonify({
            "results": results,
            "plot_json": plot_json,
            "sensitivity_json": sensitivity_json,
            "status": "success"
        })
    except Exception as e:
        print(f"Error in /api/optimize: {e}")
        return jsonify({"error": str(e), "status": "error"}), 400

if __name__ == "__main__":
    app.run(debug=True)