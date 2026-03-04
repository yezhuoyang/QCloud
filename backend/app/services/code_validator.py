"""
Secure code validator for Qiskit circuits.
Only allows QuantumCircuit definition, gates, and measurements.
No imports, no simulation code, no arbitrary Python execution.
"""
import ast
from typing import Optional, Tuple, Set

# Forbidden function calls - users cannot call these
FORBIDDEN_CALLS = {
    # Dangerous built-ins
    'exec', 'eval', 'compile', 'open', 'input', 'breakpoint',
    '__import__', 'globals', 'locals', 'vars', 'dir',
    'getattr', 'setattr', 'delattr', 'hasattr',
    'memoryview', 'bytearray', 'bytes',
    'classmethod', 'staticmethod', 'property',
    'super', 'type', 'object',
    'help', 'exit', 'quit',
    # Simulation-related - handled by backend
    'transpile', 'AerSimulator', 'Aer',
    'QiskitRuntimeService', 'Sampler', 'SamplerV2',
}

# Allowed built-in functions for circuit definition
ALLOWED_BUILTINS = {
    'range', 'len', 'int', 'float', 'str', 'bool', 'list', 'tuple', 'dict', 'set',
    'abs', 'round', 'min', 'max', 'sum', 'sorted', 'reversed', 'enumerate', 'zip',
    'print',  # No-op print
    'True', 'False', 'None',
    # Math functions available directly
    'pi',
}


class CodeSecurityError(Exception):
    """Raised when code contains forbidden operations."""
    pass


class SecureCodeValidator(ast.NodeVisitor):
    """AST visitor that validates code for security - only circuit definitions allowed."""

    def __init__(self):
        self.errors: list[str] = []
        self.has_circuit = False

    def visit_Import(self, node: ast.Import):
        """Reject ALL import statements - imports are handled by the backend."""
        import_names = [alias.name for alias in node.names]
        self.errors.append(
            f"Import statements are not allowed. Remove: 'import {', '.join(import_names)}'. "
            "The backend handles all imports automatically."
        )
        self.generic_visit(node)

    def visit_ImportFrom(self, node: ast.ImportFrom):
        """Reject ALL from...import statements - imports are handled by the backend."""
        self.errors.append(
            f"Import statements are not allowed. Remove: 'from {node.module} import ...'. "
            "The backend handles all imports automatically."
        )
        self.generic_visit(node)

    def visit_Call(self, node: ast.Call):
        """Check function calls."""
        # Check for forbidden function calls
        if isinstance(node.func, ast.Name):
            if node.func.id in FORBIDDEN_CALLS:
                self.errors.append(
                    f"Function '{node.func.id}' is not allowed. "
                    "Only define your QuantumCircuit, add gates, and measurements."
                )
            # Track if QuantumCircuit is being created
            if node.func.id == 'QuantumCircuit':
                self.has_circuit = True

        # Check for method calls that might be dangerous
        if isinstance(node.func, ast.Attribute):
            dangerous_methods = {'__class__', '__bases__', '__subclasses__', '__mro__', '__code__', '__globals__'}
            if node.func.attr in dangerous_methods:
                self.errors.append(f"Method '{node.func.attr}' is not allowed for security reasons.")

            # Block simulation-related method calls
            simulation_methods = {'run', 'execute', 'result', 'get_counts', 'get_statevector'}
            if node.func.attr in simulation_methods:
                # Check if it's being called on a simulator-like object
                if isinstance(node.func.value, ast.Name):
                    if node.func.value.id in {'simulator', 'backend', 'sampler', 'job'}:
                        self.errors.append(
                            f"Simulation code is not allowed. Remove '{node.func.value.id}.{node.func.attr}(...)'. "
                            "The backend handles simulation automatically."
                        )

        self.generic_visit(node)

    def visit_Attribute(self, node: ast.Attribute):
        """Check attribute access."""
        dangerous_attrs = {'__class__', '__bases__', '__subclasses__', '__mro__', '__code__', '__globals__', '__builtins__'}
        if node.attr in dangerous_attrs:
            self.errors.append(f"Attribute '{node.attr}' access is not allowed for security reasons.")
        self.generic_visit(node)

    def visit_Name(self, node: ast.Name):
        """Check variable names."""
        # Block access to dangerous names
        if node.id.startswith('__') and node.id.endswith('__'):
            self.errors.append(f"Dunder name '{node.id}' is not allowed.")
        self.generic_visit(node)

    def visit_With(self, node: ast.With):
        """Allow with statements for dynamic circuits (qc.if_test, etc.)."""
        self.generic_visit(node)

    def visit_Try(self, node: ast.Try):
        """Disallow try/except (could hide errors)."""
        self.errors.append("'try/except' statements are not allowed.")
        self.generic_visit(node)

    def visit_Raise(self, node: ast.Raise):
        """Disallow raise statements."""
        self.errors.append("'raise' statements are not allowed.")
        self.generic_visit(node)

    def visit_Assert(self, node: ast.Assert):
        """Disallow assert statements."""
        self.errors.append("'assert' statements are not allowed.")
        self.generic_visit(node)

    def visit_Delete(self, node: ast.Delete):
        """Disallow del statements."""
        self.errors.append("'del' statements are not allowed.")
        self.generic_visit(node)

    def visit_Global(self, node: ast.Global):
        """Disallow global statements."""
        self.errors.append("'global' statements are not allowed.")
        self.generic_visit(node)

    def visit_Nonlocal(self, node: ast.Nonlocal):
        """Disallow nonlocal statements."""
        self.errors.append("'nonlocal' statements are not allowed.")
        self.generic_visit(node)

    def visit_Lambda(self, node: ast.Lambda):
        """Allow simple lambdas but visit their contents."""
        self.generic_visit(node)

    def visit_ClassDef(self, node: ast.ClassDef):
        """Disallow class definitions."""
        self.errors.append("Class definitions are not allowed.")
        self.generic_visit(node)

    def visit_AsyncFunctionDef(self, node: ast.AsyncFunctionDef):
        """Disallow async functions."""
        self.errors.append("Async functions are not allowed.")
        self.generic_visit(node)

    def visit_Await(self, node: ast.Await):
        """Disallow await expressions."""
        self.errors.append("'await' expressions are not allowed.")
        self.generic_visit(node)

    def visit_Yield(self, node: ast.Yield):
        """Disallow yield expressions."""
        self.errors.append("'yield' expressions are not allowed.")
        self.generic_visit(node)

    def visit_YieldFrom(self, node: ast.YieldFrom):
        """Disallow yield from expressions."""
        self.errors.append("'yield from' expressions are not allowed.")
        self.generic_visit(node)


def validate_code(code: str) -> Tuple[bool, Optional[str]]:
    """
    Validate that the code is safe to execute.
    Only allows QuantumCircuit definition, gates, and measurements.

    Returns:
        Tuple of (is_valid, error_message)
    """
    # Check code length
    if len(code) > 50000:  # 50KB limit
        return False, "Code is too long (max 50KB)"

    # Check for obvious dangerous patterns (belt and suspenders)
    dangerous_patterns = [
        'os.', 'sys.', 'subprocess', 'socket', 'urllib', 'requests',
        'shutil', 'pathlib', 'pickle', 'marshal', 'shelve',
        '__builtins__', '__import__', 'importlib',
        'open(', 'file(', 'input(',
        'exec(', 'eval(', 'compile(',
    ]
    code_lower = code.lower()
    for pattern in dangerous_patterns:
        if pattern.lower() in code_lower:
            return False, f"Forbidden pattern detected: '{pattern}'. Only QuantumCircuit definition is allowed."

    # Parse the code into an AST
    try:
        tree = ast.parse(code)
    except SyntaxError as e:
        return False, f"Syntax error in code: {e}"

    # Validate the AST
    validator = SecureCodeValidator()
    validator.visit(tree)

    if validator.errors:
        return False, "; ".join(validator.errors[:3])  # Return first 3 errors

    return True, None


def execute_circuit_code(code: str) -> Tuple[Optional[object], Optional[set], Optional[list], Optional[str]]:
    """
    Safely execute Qiskit circuit code and return the circuit + post-selection set + initial layout.
    Users can only define QuantumCircuit, add gates, and measurements.
    All imports and simulation are handled by the backend.

    Students may optionally define:
    - POST_SELECT as a set of bitstrings (e.g., POST_SELECT = {"00"})
    - INITIAL_LAYOUT as a list of ints (e.g., INITIAL_LAYOUT = [0, 1, 2, 3])

    Returns:
        Tuple of (circuit, post_select_set_or_None, initial_layout_or_None, error_message)
    """
    # First validate the code
    is_valid, error = validate_code(code)
    if not is_valid:
        return None, None, None, error

    # Create a restricted namespace with only circuit-related items
    import math
    try:
        import numpy as np
    except ImportError:
        np = None

    from qiskit import QuantumCircuit, QuantumRegister, ClassicalRegister

    # Safe built-ins - NO __import__ since we don't allow imports
    safe_builtins = {
        'range': range,
        'len': len,
        'int': int,
        'float': float,
        'str': str,
        'bool': bool,
        'list': list,
        'tuple': tuple,
        'dict': dict,
        'set': set,
        'abs': abs,
        'round': round,
        'min': min,
        'max': max,
        'sum': sum,
        'sorted': sorted,
        'reversed': reversed,
        'enumerate': enumerate,
        'zip': zip,
        'True': True,
        'False': False,
        'None': None,
        'print': lambda *args, **kwargs: None,  # No-op print
    }

    # Create restricted namespace with ONLY circuit-related classes
    namespace = {
        '__builtins__': safe_builtins,
        # Qiskit circuit classes
        'QuantumCircuit': QuantumCircuit,
        'QuantumRegister': QuantumRegister,
        'ClassicalRegister': ClassicalRegister,
        # Math constants and functions for rotation angles
        'math': math,
        'pi': math.pi,
        'sqrt': math.sqrt,
        'cos': math.cos,
        'sin': math.sin,
        'tan': math.tan,
        'acos': math.acos,
        'asin': math.asin,
        'atan': math.atan,
        'exp': math.exp,
        'log': math.log,
    }

    # Add numpy if available (for array operations in gates)
    if np is not None:
        namespace['numpy'] = np
        namespace['np'] = np

    try:
        exec(code, namespace)
    except Exception as e:
        return None, None, None, f"Error executing code: {type(e).__name__}: {str(e)}"

    # Find the QuantumCircuit in the namespace
    circuit = None
    for name, obj in namespace.items():
        if name.startswith('_'):
            continue
        if isinstance(obj, QuantumCircuit):
            circuit = obj
            break

    # Also check common variable names
    for var_name in ['circuit', 'qc', 'circ', 'q']:
        if var_name in namespace and isinstance(namespace[var_name], QuantumCircuit):
            circuit = namespace[var_name]
            break

    if circuit is None:
        return None, None, None, "No QuantumCircuit found. Create a circuit using 'qc = QuantumCircuit(n, n)' or 'circuit = QuantumCircuit(n)'"

    # Extract POST_SELECT if defined by the student
    post_select = None
    if 'POST_SELECT' in namespace:
        ps = namespace['POST_SELECT']
        if isinstance(ps, (set, list, tuple)):
            post_select = set()
            for item in ps:
                s = str(item)
                if all(c in '01' for c in s):
                    post_select.add(s)
            if not post_select:
                post_select = None

    # Extract INITIAL_LAYOUT if defined by the student
    initial_layout = None
    if 'INITIAL_LAYOUT' in namespace:
        il = namespace['INITIAL_LAYOUT']
        if isinstance(il, (list, tuple)) and all(isinstance(x, int) for x in il):
            initial_layout = list(il)

    return circuit, post_select, initial_layout, None
