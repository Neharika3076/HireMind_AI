const test = require("node:test");
const assert = require("node:assert/strict");
const { calculatePayroll, parsePayrollMonth } = require("../services/payroll-calculations");

test("parsePayrollMonth accepts month numbers and names", () => {
    assert.deepEqual(parsePayrollMonth(10), { number: 10, name: "October" });
    assert.deepEqual(parsePayrollMonth("february"), { number: 2, name: "February" });
    assert.equal(parsePayrollMonth("13"), null);
});

test("calculatePayroll returns rounded salary totals and component breakdowns", () => {
    const result = calculatePayroll({
        baseSalary: 50000,
        allowances: [{ name: "Housing", amount: 7500.255 }, { name: "Travel", amount: 500 }],
        deductions: [{ name: "Tax", amount: 6250.125 }]
    });

    assert.deepEqual(result, {
        basicSalary: 50000,
        allowances: 8000.26,
        deductions: 6250.13,
        netSalary: 51750.13,
        earnings: [
            { name: "Housing", amount: 7500.26 },
            { name: "Travel", amount: 500 }
        ],
        deductionItems: [{ name: "Tax", amount: 6250.13 }]
    });
});

test("calculatePayroll rejects a negative net salary", () => {
    assert.throws(
        () => calculatePayroll({ baseSalary: 100, allowances: [], deductions: [{ name: "Tax", amount: 101 }] }),
        /deductions exceed/
    );
});
