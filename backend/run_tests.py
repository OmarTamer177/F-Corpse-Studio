import unittest
import sys
import os
import time
import argparse

# Set testing environment variables before any application imports
os.environ.setdefault('FLASK_ENV', 'testing')
os.environ.setdefault('DATABASE_URL', 'sqlite:///:memory:')

# Ensure backend root is on sys.path
BACKEND_DIR = os.path.abspath(os.path.dirname(__file__))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

def run_unit_tests():
    # Force hermetic testing configuration for unit tests
    os.environ['FLASK_ENV'] = 'testing'
    os.environ['DATABASE_URL'] = 'sqlite:///:memory:'

    print("\n" + "=" * 70)
    print("FCORPSE STUDIO — UNIT TEST SUITE")
    print("Hermetic in-memory SQLite isolation (no external DB required)")
    print("=" * 70)

    start_time = time.time()
    unit_dir = os.path.join(BACKEND_DIR, 'tests', 'unit')
    loader = unittest.TestLoader()
    suite = loader.discover(unit_dir, pattern='test_*.py')

    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    elapsed = time.time() - start_time

    print("\n" + "=" * 70)
    print("UNIT TEST EXECUTION SUMMARY:")
    print(f"Total Tests Run : {result.testsRun}")
    print(f"Successes       : {result.testsRun - len(result.failures) - len(result.errors)}")
    print(f"Failures        : {len(result.failures)}")
    print(f"Errors          : {len(result.errors)}")
    print(f"Time Elapsed    : {elapsed:.3f}s")
    print("=" * 70)

    return result.wasSuccessful()

def run_e2e_tests():
    print("\n" + "=" * 70)
    print("FCORPSE STUDIO — END-TO-END / INTEGRATION SUITE")
    print("Requires live PostgreSQL database or seeded instance")
    print("=" * 70)

    e2e_dir = os.path.join(BACKEND_DIR, 'tests', 'e2e')
    if not os.path.exists(e2e_dir):
        print("[WARN] No e2e directory found.")
        return True

    all_passed = True
    for f in sorted(os.listdir(e2e_dir)):
        if f.startswith('test_') and f.endswith('.py'):
            filepath = os.path.join(e2e_dir, f)
            print(f"\n>>> Running E2E script: {f} ...")
            start = time.time()
            ret = os.system(f'"{sys.executable}" "{filepath}"')
            elapsed = time.time() - start
            if ret != 0:
                print(f"[FAIL] {f} exited with code {ret} ({elapsed:.2f}s)")
                all_passed = False
            else:
                print(f"[PASS] {f} completed successfully ({elapsed:.2f}s)")

    return all_passed

def main():
    parser = argparse.ArgumentParser(description="Voltix Backend Test Suite Runner")
    parser.add_argument('--mode', choices=['unit', 'e2e', 'all'], default='unit',
                        help="Test mode to run: 'unit' (default, CI-friendly), 'e2e', or 'all'")
    args = parser.parse_args()

    overall_success = True
    if args.mode in ('unit', 'all'):
        unit_success = run_unit_tests()
        if not unit_success:
            overall_success = False

    if args.mode in ('e2e', 'all'):
        e2e_success = run_e2e_tests()
        if not e2e_success:
            overall_success = False

    if overall_success:
        print("\n>>> ALL EXECUTED SUITES PASSED SUCCESSFULLY! <<<\n")
        return 0
    else:
        print("\n>>> SOME TESTS FAILED. PLEASE REVIEW LOGS. <<<\n")
        return 1

if __name__ == '__main__':
    sys.exit(main())
