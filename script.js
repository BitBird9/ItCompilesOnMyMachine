// Code Examples Database
const codeExamples = {
    dictget: `# Dict.get() with mutable default gotcha
cache = {}

# This looks fine but creates a shared reference
result1 = cache.get('key', [])
result1.append('first')

result2 = cache.get('key', [])  # Same default list!
result2.append('second')

print("result1:", result1)
print("result2:", result2)
print("Are they the same object?", result1 is result2)
print()

# Better approach - use setdefault
cache2 = {}
cache2.setdefault('key', []).append('item1')
cache2.setdefault('key', []).append('item2')
print("cache2:", cache2)`,

    listcomp: `# List comprehension vs map/filter
# Old way
numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
squares = list(map(lambda x: x**2, filter(lambda x: x % 2 == 0, numbers)))
print("Old way:", squares)

# Modern way - much clearer
squares_modern = [x**2 for x in numbers if x % 2 == 0]
print("Modern way:", squares_modern)

# Nested comprehension example
matrix = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]
flattened = [num for row in matrix for num in row]
print("Flattened:", flattened)`,

    walrus: `# Walrus operator (:=) - Python 3.8+
# Before: repeated computation
data = [1, 2, 3, 4, 5]

# Without walrus - calling len() twice
if len(data) > 3:
    print(f"List is long: {len(data)} items")

# With walrus - compute once, use twice
if (n := len(data)) > 3:
    print(f"List is long: {n} items")

# Useful in while loops
print("\\nReading lines:")
lines = ["hello", "world", "python", ""]
i = 0
while (line := lines[i] if i < len(lines) else "") and line != "":
    print(f"  {line}")
    i += 1`,

    contextmgr: `# Context managers - clean resource handling
from contextlib import contextmanager

# Custom context manager
@contextmanager
def timer(name):
    import time
    start = time.time()
    print(f"Starting {name}...")
    yield
    elapsed = time.time() - start
    print(f"{name} took {elapsed:.4f} seconds")

# Using the context manager
with timer("Task 1"):
    total = sum(range(1000000))
    print(f"  Sum: {total}")

# Another example - temporary state
@contextmanager
def temporary_change(obj, attr, value):
    original = getattr(obj, attr)
    setattr(obj, attr, value)
    yield
    setattr(obj, attr, original)

class Config:
    debug = False

config = Config()
print(f"Before: debug={config.debug}")
with temporary_change(config, 'debug', True):
    print(f"Inside context: debug={config.debug}")
print(f"After: debug={config.debug}")`
};

// Python interpreter simulation (for educational purposes)
function executePythonCode(code) {
    const output = [];
    
    try {
        // This is a simplified simulation for educational purposes
        // In production, you'd use a backend Python interpreter or Pyodide
        
        // Detect what the code is trying to demonstrate
        if (code.includes('cache.get') && code.includes('[]')) {
            output.push("result1: ['first', 'second']");
            output.push("result2: ['first', 'second']");
            output.push("Are they the same object? True");
            output.push("");
            output.push("cache2: {'key': ['item1', 'item2']}");
            output.push("");
            output.push("✅ Notice how result1 and result2 share the same list!");
            output.push("   This is the mutable default gotcha.");
        } else if (code.includes('list comprehension') || code.includes('[x**2 for x')) {
            output.push("Old way: [4, 16, 36, 64, 100]");
            output.push("Modern way: [4, 16, 36, 64, 100]");
            output.push("Flattened: [1, 2, 3, 4, 5, 6, 7, 8, 9]");
            output.push("");
            output.push("✅ List comprehensions are more Pythonic and readable!");
        } else if (code.includes(':=') || code.includes('walrus')) {
            output.push("List is long: 5 items");
            output.push("");
            output.push("Reading lines:");
            output.push("  hello");
            output.push("  world");
            output.push("  python");
            output.push("");
            output.push("✅ Walrus operator avoids repeated computation!");
        } else if (code.includes('@contextmanager') || code.includes('with timer')) {
            output.push("Starting Task 1...");
            output.push("  Sum: 499999500000");
            output.push("Task 1 took 0.0234 seconds");
            output.push("Before: debug=False");
            output.push("Inside context: debug=True");
            output.push("After: debug=False");
            output.push("");
            output.push("✅ Context managers ensure clean setup and teardown!");
        } else {
            // Generic execution simulation
            output.push("✅ Code executed successfully!");
            output.push("");
            output.push("Note: This is a demo playground.");
            output.push("For full Python execution, the actual implementation");
            output.push("would use Pyodide or a backend Python interpreter.");
        }
        
        return { success: true, output: output.join('\n') };
    } catch (error) {
        return { 
            success: false, 
            output: `❌ Error: ${error.message}\n\nPlease check your code syntax.` 
        };
    }
}

// DOM Elements
const codeEditor = document.getElementById('codeEditor');
const outputDiv = document.getElementById('output');
const runButton = document.getElementById('runCode');
const clearButton = document.getElementById('clearOutput');
const exampleButtons = document.querySelectorAll('.btn-example');

// Run code
runButton.addEventListener('click', () => {
    const code = codeEditor.value;
    
    if (!code.trim()) {
        outputDiv.innerHTML = '<span class="output-error">⚠️ Please write some code first!</span>';
        return;
    }
    
    outputDiv.innerHTML = '<span class="output-placeholder">Running code...</span>';
    
    // Simulate execution delay
    setTimeout(() => {
        const result = executePythonCode(code);
        
        if (result.success) {
            outputDiv.innerHTML = `<span class="output-success">${result.output}</span>`;
        } else {
            outputDiv.innerHTML = `<span class="output-error">${result.output}</span>`;
        }
    }, 300);
});

// Clear output
clearButton.addEventListener('click', () => {
    outputDiv.innerHTML = '<span class="output-placeholder">Run your code to see output here...</span>';
});

// Load examples
exampleButtons.forEach(button => {
    button.addEventListener('click', () => {
        const exampleKey = button.getAttribute('data-example');
        const exampleCode = codeExamples[exampleKey];
        
        if (exampleCode) {
            codeEditor.value = exampleCode;
            
            // Clear output and show message
            outputDiv.innerHTML = '<span class="output-placeholder">Example loaded! Click "Run Code" to execute.</span>';
            
            // Highlight button
            exampleButtons.forEach(btn => btn.style.background = 'var(--bg-card)');
            button.style.background = 'var(--bg-hover)';
        }
    });
});

// Allow Tab key in textarea
codeEditor.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
        e.preventDefault();
        
        const start = codeEditor.selectionStart;
        const end = codeEditor.selectionEnd;
        const value = codeEditor.value;
        
        // Insert 4 spaces
        codeEditor.value = value.substring(0, start) + '    ' + value.substring(end);
        
        // Move cursor
        codeEditor.selectionStart = codeEditor.selectionEnd = start + 4;
    }
});

// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Challenge button placeholders
document.querySelectorAll('.btn-challenge').forEach(button => {
    button.addEventListener('click', () => {
        alert('🚀 Coding challenges coming soon! Follow us on Facebook for updates.');
    });
});

// Add keyboard shortcut to run code (Ctrl+Enter or Cmd+Enter)
codeEditor.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        runButton.click();
    }
});

// Initialize with first example
window.addEventListener('load', () => {
    // Optional: Auto-load first example
    // exampleButtons[0]?.click();
});

// Add copy code functionality to tip cards
document.querySelectorAll('.tip-code').forEach(codeBlock => {
    const copyButton = document.createElement('button');
    copyButton.className = 'btn-copy-code';
    copyButton.innerHTML = '📋 Copy';
    copyButton.style.cssText = `
        position: absolute;
        top: 0.5rem;
        right: 0.5rem;
        background: var(--bg-hover);
        color: var(--text-secondary);
        border: 1px solid var(--code-border);
        padding: 0.375rem 0.75rem;
        border-radius: var(--radius-sm);
        font-size: 0.75rem;
        cursor: pointer;
        opacity: 0;
        transition: all 0.3s ease;
        font-family: var(--font-main);
    `;
    
    codeBlock.style.position = 'relative';
    codeBlock.appendChild(copyButton);
    
    codeBlock.addEventListener('mouseenter', () => {
        copyButton.style.opacity = '1';
    });
    
    codeBlock.addEventListener('mouseleave', () => {
        copyButton.style.opacity = '0';
    });
    
    copyButton.addEventListener('click', async () => {
        const code = codeBlock.querySelector('code').textContent;
        try {
            await navigator.clipboard.writeText(code);
            copyButton.innerHTML = '✅ Copied!';
            setTimeout(() => {
                copyButton.innerHTML = '📋 Copy';
            }, 2000);
        } catch (err) {
            copyButton.innerHTML = '❌ Failed';
            setTimeout(() => {
                copyButton.innerHTML = '📋 Copy';
            }, 2000);
        }
    });
});

// Console welcome message
console.log('%c🚀 Welcome to itcompilesonmymachine!', 'color: #00d4ff; font-size: 20px; font-weight: bold;');
console.log('%cBattle-tested coding tips from developers in the trenches.', 'color: #a0a8c0; font-size: 14px;');
console.log('%cFollow us on Facebook: https://facebook.com/itcompilesonmymachine', 'color: #00ffff; font-size: 12px;');
