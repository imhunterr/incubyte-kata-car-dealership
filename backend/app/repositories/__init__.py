"""Data access layer. All SQL lives in this package.

Each repository wraps a SQLAlchemy session and commits its own writes, so
every write method is one complete, atomic unit of work.
"""
