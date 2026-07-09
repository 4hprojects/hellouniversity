# Lesson 27: Hash Tables

**Course:** Data Structures and Algorithms  
**Section:** Hashing, Maps, Tries, and Dynamic Programming  
**Level:** Intermediate  
**Estimated Time:** 35 to 45 minutes  
**Primary Language:** Python  
**VisualDSA Demo:** `/visualdsa/hash-table-visualizer`

---

## Lesson Overview

A hash table is a data structure that stores data using key-value pairs.

It uses a hash function to convert a key into an index where the value can be stored.

Hash tables are useful when fast lookup, insertion, and deletion are needed.

In Python, dictionaries use hash table concepts.

---

## Learning Objectives

At the end of this lesson, you should be able to:

- Define a hash table.
- Explain key-value pairs.
- Explain the role of a hash function.
- Describe collisions.
- Compare chaining and open addressing.
- Use Python dictionaries as hash table examples.
- Analyze average and worst-case hash table operations.

---

## Key Terms

| Term | Meaning |
|---|---|
| Hash Table | A structure that stores values using keys |
| Key | A unique identifier used to find a value |
| Value | The data associated with a key |
| Hash Function | A function that maps a key to an index |
| Bucket | A storage position in the table |
| Collision | When two keys map to the same index |
| Chaining | Handling collisions using a list at each bucket |
| Open Addressing | Handling collisions by finding another open slot |

---

## Simple Explanation

A hash table works like a storage cabinet.

You use a key to decide where a value should be stored.

Example:

```text
Key: "student_001"
Value: "Ana"
```

The hash function decides the index:

```text
hash("student_001") → 3
```

The value is stored at index `3`.

---

## Key-Value Pair Example

```text
Student ID → Student Name
2024001 → Ana
2024002 → Ben
2024003 → Carlo
```

This is a key-value relationship.

The student ID is the key.  
The student name is the value.

---

## Python Dictionary Example

```python
students = {
    "2024001": "Ana",
    "2024002": "Ben",
    "2024003": "Carlo"
}

print(students["2024002"])
```

Output:

```text
Ben
```

The key `"2024002"` is used to find the value `"Ben"`.

---

## Basic Operations

```python
students = {}

students["2024001"] = "Ana"
students["2024002"] = "Ben"

print(students["2024001"])

students["2024001"] = "Ana Reyes"

del students["2024002"]

print(students)
```

Output:

```text
Ana
{'2024001': 'Ana Reyes'}
```

---

## Code Walkthrough

```python
students = {}
```

This creates an empty dictionary.

```python
students["2024001"] = "Ana"
```

This inserts a key-value pair.

```python
print(students["2024001"])
```

This retrieves a value using its key.

```python
students["2024001"] = "Ana Reyes"
```

This updates the value for an existing key.

```python
del students["2024002"]
```

This deletes a key-value pair.

---

## Hash Function Concept

A hash function converts a key into an index.

Simple example:

```python
def simple_hash(key, table_size):
    total = 0

    for character in key:
        total += ord(character)

    return total % table_size


print(simple_hash("Ana", 10))
```

Output may be:

```text
2
```

This means `"Ana"` maps to index `2`.

This is a simple example for learning. Real hash functions are more carefully designed.

---

## Collision Example

A collision happens when two keys map to the same index.

Example:

```text
hash("Ana") → 2
hash("Ben") → 2
```

Both keys want index `2`.

The hash table needs a collision-handling strategy.

---

## Collision Handling: Chaining

In chaining, each bucket can store a list of items.

Example:

```text
Index 2 → [("Ana", 85), ("Ben", 90)]
```

Both keys stay in the same bucket, but inside a list.

---

## Collision Handling: Open Addressing

In open addressing, the table looks for another available slot.

Example:

```text
Index 2 is occupied.
Try index 3.
If index 3 is open, store the value there.
```

This avoids lists inside buckets, but it needs a good probing strategy.

---

## Time and Space Complexity

| Operation | Average Case | Worst Case |
|---|---|---|
| Insert | O(1) | O(n) |
| Search | O(1) | O(n) |
| Delete | O(1) | O(n) |

Space complexity:

```text
O(n)
```

The worst case can happen when many keys collide.

---

## Why Hash Tables Are Useful

Hash tables are useful because they provide fast lookup by key.

Example:

Instead of searching through every student record, you can directly access a record using the student ID.

```python
student_records = {
    "2024001": {"name": "Ana", "grade": 92},
    "2024002": {"name": "Ben", "grade": 88}
}

print(student_records["2024001"]["grade"])
```

Output:

```text
92
```

---

## Common Mistakes

- Confusing keys and values.
- Using duplicate keys without realizing the old value is replaced.
- Assuming hash tables are always O(1).
- Forgetting that collisions can happen.
- Using values as keys when they are not unique.
- Trying to access a key that does not exist.

---

## Safer Key Access

Instead of directly accessing a key, you can use `get()`.

```python
students = {
    "2024001": "Ana",
    "2024002": "Ben"
}

print(students.get("2024003", "Student not found"))
```

Output:

```text
Student not found
```

---

## Real-World Applications

Hash tables are used in:

- Student record lookup.
- User account systems.
- Caching.
- Counting frequency.
- Database indexing concepts.
- Symbol tables in compilers.
- Dictionaries and maps.
- Login username lookup.

---

## VisualDSA Integration

Use the VisualDSA Hash Table Visualizer to see key-to-index mapping and collision handling.

Recommended interactions:

- Insert key-value pairs.
- Show the computed index.
- Trigger a collision.
- Resolve collisions using chaining.
- Compare successful and failed search.

Suggested VisualDSA route:

```text
/visualdsa/hash-table-visualizer
```

Data that can be captured for analytics:

- Key-value confusion.
- Collision misunderstanding.
- Wrong index prediction.
- Lookup mistakes.
- Time spent resolving collision cases.

---

## Practice Activity

Create a student record lookup system using a Python dictionary.

Requirements:

- Use student ID as the key.
- Store student name and grade as values.
- Allow lookup by student ID.
- Display “Student not found” if the ID does not exist.

Sample data:

```python
records = {
    "2024001": {"name": "Ana", "grade": 92},
    "2024002": {"name": "Ben", "grade": 88},
    "2024003": {"name": "Carlo", "grade": 95}
}
```

Reflection question:

Why is a hash table better than linear search for repeated student ID lookup?

---

## Quick Check

1. What is a hash table?
2. What is a key-value pair?
3. What does a hash function do?
4. What is a collision?
5. What is the average search complexity of a hash table?

---

## Answer Key

1. A hash table stores values using keys.
2. A key-value pair connects an identifier to stored data.
3. A hash function maps a key to an index.
4. A collision happens when two keys map to the same index.
5. O(1) on average.

---

## Summary

A hash table stores data using key-value pairs and uses a hash function to find where values should be stored. It supports fast average lookup, insertion, and deletion, but collisions must be handled correctly.

---

## Previous and Next Lesson

Previous Lesson: [Lesson 26: Dynamic Programming Basics](./lesson-26-dynamic-programming.md)  
Next Lesson: [Lesson 28: Sets and Maps](./lesson-28-sets-and-maps.md)
