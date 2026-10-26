const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

function roundMoney(value) {
    return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function parsePayrollMonth(value) {
    if (Number.isInteger(value) && value >= 1 && value <= 12) {
        return { number: value, name: monthNames[value - 1] };
    }
    if (typeof value === "string") {
        const trimmed = value.trim();
        const numeric = Number(trimmed);
        if (Number.isInteger(numeric) && numeric >= 1 && numeric <= 12) {
            return { number: numeric, name: monthNames[numeric - 1] };
        }
        const index = monthNames.findIndex((month) => month.toLowerCase() === trimmed.toLowerCase());
        if (index !== -1) return { number: index + 1, name: monthNames[index] };
    }
    return null;
}

function calculatePayroll(structure) {
    const earnings = (structure.allowances || []).map(({ name, amount }) => ({
        name,
        amount: roundMoney(amount)
    }));
    const deductionItems = (structure.deductions || []).map(({ name, amount }) => ({
        name,
        amount: roundMoney(amount)
    }));
    const allowances = roundMoney(earnings.reduce((total, item) => total + item.amount, 0));
    const deductions = roundMoney(deductionItems.reduce((total, item) => total + item.amount, 0));
    const basicSalary = roundMoney(structure.baseSalary);
    const netSalary = roundMoney(basicSalary + allowances - deductions);

    if (netSalary < 0) {
        throw new Error("Salary structure deductions exceed base salary and allowances.");
    }

    return { basicSalary, allowances, deductions, netSalary, earnings, deductionItems };
}

module.exports = { calculatePayroll, parsePayrollMonth };
