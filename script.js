
document.addEventListener('DOMContentLoaded', function() {
    // Style for hiding number input arrows
    const style = document.createElement('style');
    style.textContent = `
        input[type="number"]::-webkit-inner-spin-button,
        input[type="number"]::-webkit-outer-spin-button {
            -webkit-appearance: none;
            margin: 0;
        }
        input[type="number"] {
            -moz-appearance: textfield;
        }
    `;
    document.head.appendChild(style);

    let calculationCount = 0;
    const loginBtn = document.querySelector('.login-btn');
    const taxForm = document.getElementById('taxForm');
    const errorMsg = document.getElementById('errorMsg');
    const requiredFields = [
        { id: 'salary', name: 'Income from Salary' }
    ];

    // Check login status with server
    function checkLoginStatus() {
        fetch('http://localhost:3000/api/check-auth', {
          credentials: 'include'
        })
        .then(response => response.json())
        .then(data => {
          if (data.loggedIn) {
            loginBtn.textContent = 'Logout';
            loginBtn.onclick = logoutUser;
            localStorage.setItem('isLoggedIn', 'true');
          } else {
            loginBtn.textContent = 'Login / Sign Up';
            loginBtn.onclick = () => window.location.href = 'login.html';
            localStorage.removeItem('isLoggedIn');
          }
        })
        .catch(error => {
          console.error('Auth check failed:', error);
          loginBtn.textContent = 'Login / Sign Up';
          loginBtn.onclick = () => window.location.href = 'login.html';
        });
      }
    checkLoginStatus();

    // Logout function
    function logoutUser() {
        fetch('http://localhost:3000/api/logout', {
            method: 'POST',
            credentials: 'include'
        })
        .then(() => {
            localStorage.removeItem('isLoggedIn');
            window.location.reload();
        })
        .catch(error => console.error('Logout failed:', error));
    }

    // Tax calculation handler
    document.getElementById("calculateTax").addEventListener("click", function() {
        clearErrors();
        
        // Validate required fields
        let isValid = true;
        requiredFields.forEach(field => {
            const input = document.getElementById(field.id);
            if (!input.value.trim()) {
                input.style.border = '1px solid red';
                showError(`${field.name} is required`);
                isValid = false;
            }
        });
        if (!isValid) return;

        // Check calculation count and login status
        calculationCount++;
        if (calculationCount > 1) {
            fetch('http://localhost:3000/api/check-auth', {
                credentials: 'include'
            })
            .then(response => response.json())
            .then(data => {
                if (!data.loggedIn) {
                    window.location.href = 'login.html';
                    return;
                }
                performTaxCalculation();
            })
            .catch(() => window.location.href = 'login.html');
        } else {
            performTaxCalculation();
        }
    });

    // Perform the actual tax calculation
    function performTaxCalculation() {
        let salary = parseFloat(document.getElementById("salary").value) || 0;
        let interest = parseFloat(document.getElementById("interest").value) || 0;
        let rentalIncome = parseFloat(document.getElementById("rentalIncome").value) || 0;
        let digitalAssets = parseFloat(document.getElementById("digitalAssets").value) || 0;
        let exemptAllowances = parseFloat(document.getElementById("exemptAllowances").value) || 0;
        let homeLoanInterest = parseFloat(document.getElementById("homeLoanInterest").value) || 0;
        let otherIncome = parseFloat(document.getElementById("otherIncome").value) || 0;

        let deduction80C = parseFloat(document.getElementById("deduction80C").value) || 0;
        let deduction80D = parseFloat(document.getElementById("deduction80D").value) || 0;
        let deduction80EEA = parseFloat(document.getElementById("deduction80EEA").value) || 0;
        let deductionNPS = parseFloat(document.getElementById("deductionNPS").value) || 0;
        let deductionTTA = parseFloat(document.getElementById("deductionTTA").value) || 0;
        let deduction80G = parseFloat(document.getElementById("deduction80G").value) || 0;
        let deduction80CCD = parseFloat(document.getElementById("deduction80CCD").value) || 0;
        let deductionOther = parseFloat(document.getElementById("deductionOther").value) || 0;

        let grossIncome = salary + interest + rentalIncome + digitalAssets + otherIncome;
        let totalDeductions = exemptAllowances + homeLoanInterest + deduction80C + deduction80D + 
                            deduction80EEA + deductionNPS + deductionTTA + deduction80G + 
                            deduction80CCD + deductionOther;
        
        let taxableIncome = grossIncome - totalDeductions;
        taxableIncome = Math.max(0, taxableIncome);

        let tax = calculateTax(taxableIncome);
        
        showTaxResults(grossIncome, totalDeductions, taxableIncome, tax);
    }

    // Tax plans handler
    document.getElementById("showPlans").addEventListener("click", function() {
        const container = document.getElementById("taxPlansContainer");
        
        if (container.style.display === "none") {
            fetch('http://localhost:3000/api/check-auth', {
                credentials: 'include'
            })
            .then(response => response.json())
            .then(data => {
                if (!data.loggedIn) {
                    window.location.href = 'login.html';
                    return;
                }
                
                container.style.display = "block";
                let taxableIncome = calculateTaxableIncome();
                let salary = parseFloat(document.getElementById("salary").value) || 0;
                
                document.getElementById("planIncomeDisplay").textContent = taxableIncome.toLocaleString('en-IN');
                
                setTimeout(() => {
                    showTaxPlans(taxableIncome, salary);
                }, 500);
                
                this.textContent = "Hide Tax Plans";
            });
        } else {
            container.style.display = "none";
            this.textContent = "Show Tax Plans";
        }
    });

    // Helper functions
    function calculateTaxableIncome() {
        let salary = parseFloat(document.getElementById("salary").value) || 0;
        let interest = parseFloat(document.getElementById("interest").value) || 0;
        let rentalIncome = parseFloat(document.getElementById("rentalIncome").value) || 0;
        let digitalAssets = parseFloat(document.getElementById("digitalAssets").value) || 0;
        let exemptAllowances = parseFloat(document.getElementById("exemptAllowances").value) || 0;
        let homeLoanInterest = parseFloat(document.getElementById("homeLoanInterest").value) || 0;
        let otherIncome = parseFloat(document.getElementById("otherIncome").value) || 0;

        let deduction80C = parseFloat(document.getElementById("deduction80C").value) || 0;
        let deduction80D = parseFloat(document.getElementById("deduction80D").value) || 0;
        let deduction80EEA = parseFloat(document.getElementById("deduction80EEA").value) || 0;
        let deductionNPS = parseFloat(document.getElementById("deductionNPS").value) || 0;
        let deductionTTA = parseFloat(document.getElementById("deductionTTA").value) || 0;
        let deduction80G = parseFloat(document.getElementById("deduction80G").value) || 0;
        let deduction80CCD = parseFloat(document.getElementById("deduction80CCD").value) || 0;
        let deductionOther = parseFloat(document.getElementById("deductionOther").value) || 0;

        let grossIncome = salary + interest + rentalIncome + digitalAssets + otherIncome;
        let totalDeductions = exemptAllowances + homeLoanInterest + deduction80C + deduction80D + 
                            deduction80EEA + deductionNPS + deductionTTA + deduction80G + 
                            deduction80CCD + deductionOther;
        
        return Math.max(0, grossIncome - totalDeductions);
    }

    function calculateTax(taxableIncome) {
        let tax = 0;
        if (taxableIncome <= 500000) return 0;

        const taxSlabs = [
            { limit: 500000, rate: 0 },
            { limit: 750000, rate: 0.10 },
            { limit: 1000000, rate: 0.15 },
            { limit: 1250000, rate: 0.20 },
            { limit: 1500000, rate: 0.25 },
            { limit: Infinity, rate: 0.30 }
        ];

        for (let i = 1; i < taxSlabs.length; i++) {
            if (taxableIncome > taxSlabs[i-1].limit) {
                const slabAmount = Math.min(taxableIncome, taxSlabs[i].limit) - taxSlabs[i-1].limit;
                tax += slabAmount * taxSlabs[i].rate;
            }
        }

        return tax + (tax * 0.04); 
    }

    function showTaxPlans(taxableIncome, salary) {
    const tax = calculateTax(taxableIncome);
    
    // Check if tax is zero, if so, do not show plans
    if (tax === 0) {
        document.getElementById("taxPlansList").innerHTML = "<p>No tax plans available as your estimated tax is ₹0.</p>";
        return;
    }

    const plans = generateTaxPlans(taxableIncome, salary);
    document.getElementById("taxPlansList").innerHTML = plans.join('');
    
    document.getElementById("savePlansBtn").addEventListener("click", function() {
        const selectedPlans = [];
        document.querySelectorAll('input[name="existingPlan"]:checked').forEach(checkbox => {
            selectedPlans.push(checkbox.value);
        });
        
        document.getElementById("saveStatus").textContent = "Selections saved!";
        setTimeout(() => {
            document.getElementById("saveStatus").textContent = "";
        }, 3000);
    });
}

function generateTaxPlans(taxableIncome, salary) {
    let plans = [];
    
    // Always include basic tax-saving options
    plans.push(`
        <div class="plan" style="background-color: black;">
            <h4>Standard Deductions</h4>
            <p>Consider these common tax-saving options:</p>
            <ul>
                <li>Medical insurance premiums (Section 80D)</li>
                <li>Charitable donations (Section 80G)</li>
                <li>Education loan interest (Section 80E)</li>
            </ul>
        </div>
    `);

    // Additional condition-based plans
    if (taxableIncome > 500000) {
        plans.push(`
            <div class="plan" style="background-color: black;">
                <h4>Maximize 80C Deductions</h4>
                <p>Invest ₹${Math.min(150000, salary).toLocaleString('en-IN')} in:</p>
                <ul>
                    <li>PPF (Public Provident Fund)</li>
                    <li>ELSS Mutual Funds</li>
                    <li>Life Insurance</li>
                </ul>
                <p>Potential tax saving: ₹${(Math.min(150000, salary)*0.30).toLocaleString('en-IN')}</p>
            </div>
        `);
    }
    
    if (salary > 0) {
        plans.push(`
            <div class="plan" style="background-color: black;">
                <h4>National Pension System (NPS)</h4>
                <p>Invest additional ₹50,000 for extra deduction under 80CCD(1B)</p>
                <p>Potential tax saving: ₹15,000</p>
            </div>
        `);
    }
    
    if (salary > 700000) {
        plans.push(`
            <div class="plan" style="background-color: black;">
                <h4>Health Insurance (80D)</h4>
                <p>Buy health insurance for:</p>
                <ul>
                    <li>Yourself: ₹25,000 deduction</li>
                    <li>Parents (if senior citizens): ₹50,000 extra</li>
                </ul>
                <p>Potential tax saving: ₹7,500 to ₹22,500</p>
            </div>
        `);
    }

    const exemptAllowances = parseFloat(document.getElementById("exemptAllowances").value) || 0;
    if (exemptAllowances < salary * 0.4) {
        plans.push(`
            <div class="plan" style="background-color: black;">
                <h4>HRA Optimization</h4>
                <p>If you're paying rent, claim HRA exemption properly:</p>
                <p>Minimum of: 
                1) Actual HRA received, 
                2) 50% of salary (metro) or 40% (non-metro), 
                3) Rent paid - 10% of salary</p>
            </div>
        `);
    }

    const homeLoanInterest = parseFloat(document.getElementById("homeLoanInterest").value) || 0;
    if (homeLoanInterest < 200000) {
        plans.push(`
            <div class="plan" style="background-color: black;">
                <h4>Home Loan Interest (24B)</h4>
                <p>Claim up to ₹2,00,000 interest deduction on home loan</p>
                <p>Potential tax saving: ₹60,000</p>
            </div>
        `);
    }

    return plans;
}
    function showTaxResults(grossIncome, totalDeductions, taxableIncome, tax) {
        document.getElementById("taxResult").innerHTML = `
            <strong>Tax Calculation Summary:</strong><br>
            Gross Income: ₹${grossIncome.toLocaleString('en-IN', {maximumFractionDigits: 2})}<br>
            Total Deductions: ₹${totalDeductions.toLocaleString('en-IN', {maximumFractionDigits: 2})}<br>
            Taxable Income: ₹${taxableIncome.toLocaleString('en-IN', {maximumFractionDigits: 2})}<br>
            <span style="color: #4CAF50; font-weight: bold;">
                Estimated Tax Payable: ₹${tax.toLocaleString('en-IN', {maximumFractionDigits: 2})}
            </span>
        `;
    }

    function showError(message) {
        errorMsg.textContent = message;
        errorMsg.style.display = 'block';
        setTimeout(() => {
            errorMsg.style.display = 'none';
        }, 3000);
    }

    function clearErrors() {
        errorMsg.textContent = '';
        errorMsg.style.display = 'none';
        requiredFields.forEach(field => {
            document.getElementById(field.id).style.border = '';
        });
    }
});

document.addEventListener('DOMContentLoaded', function() {
    const themeToggle = document.getElementById('themeToggle');
    const currentTheme = localStorage.getItem('theme');

    // Apply saved theme on page load
    if (currentTheme === 'light') {
        document.body.classList.add('light-mode');
        themeToggle.textContent = 'Dark Mode';
    } else {
        document.body.classList.remove('light-mode');
        themeToggle.textContent = 'Light Mode';
    }

    // Toggle theme on button click
    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('light-mode');
        const isLight = document.body.classList.contains('light-mode');
        themeToggle.textContent = isLight ? 'Dark Mode' : 'Light Mode';
        localStorage.setItem('theme', isLight ? 'light' : 'dark');
    });
});
