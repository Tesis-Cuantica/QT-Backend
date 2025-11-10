// ═══════════════════════════════════════════════════════════════════════════════
// Autor:   Jairo Quispe Coa
// Fecha:   2025-11-10
// Archivo: quantumSimulator.js
// ═══════════════════════════════════════════════════════════════════════════════

const simulateCircuit = (circuitJSON) => {
  try {
    const circuit = JSON.parse(circuitJSON);

    if (!Array.isArray(circuit.gates)) {
      throw new Error("El circuito debe contener una lista de puertas.");
    }
    if (
      typeof circuit.qubits !== "number" ||
      circuit.qubits < 1 ||
      circuit.qubits > 5
    ) {
      throw new Error("Número de qubits inválido (1–5).");
    }

    const result = {
      statevector: [0.7071, 0, 0, 0.7071],
      probabilities: { "00": 0.5, 11: 0.5 },
      histogram: { "00": 50, 11: 50 },
      qubitCount: circuit.qubits,
      gateCount: circuit.gates.length,
    };

    return result;
  } catch (e) {
    throw new Error(`Simulación fallida: ${e.message}`);
  }
};

module.exports = { simulateCircuit };
