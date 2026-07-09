# Lesson 28: Sets and Maps

**Course:** Data Structures and Algorithms  
**Section:** Hashing, Maps, Tries, and Dynamic Programming  
**Level:** Beginner to Intermediate  
**Estimated Time:** 30 to 40 minutes  
**Primary Language:** Python  
**VisualDSA Demo:** `/visualdsa/sets-and-maps-visualizer`

---

## Lesson Overview

Sets and maps are useful data structures for storing and organizing data.

A set stores unique values.

A map stores key-value pairs.

In Python:

- A set is written using `set`.
- A map-like structure is usually written using a dictionary.

These structures are useful for checking uniqueness, counting values, grouping data, and looking up records quickly.

---

## Learning Objectives

At the end of this lesson, you should be able to:

- Define a set.
- Define a map.
- Use sets to store unique values.
- Use maps to store key-value pairs.
- Count frequencies using a dictionary.
- Compare lists, sets, and maps.
- Identify practical use cases for sets and maps.

---

## Key Terms

| Term | Meaning |
|---|---|
| Set | A collection of unique values |
| Map | A structure that stores key-value pairs |
| Dictionary | Python’s common map-like data structure |
| Key | The identifier used to access a value |
| Value | The data stored under a key |
| Unique | Appearing only once |
| Frequency Count | Counting how many times each value appears |

---

## Simple Explanation

A set is useful when you only care about unique values.

Example list:

```text
["Ana", "Ben", "Ana", "Carlo"]
```

Set result:

```text
{"Ana", "Ben", "Carlo"}
```

The duplicate `"Ana"` appears only once.

A map is useful when one item points to another item.

Example:

```text
"2024001" → "Ana"
"2024002" → "Ben"
```

---

## Python Set Example

```python
students = {"Ana", "Ben", "Ana", "Carlo"}

print(students)
```

Possible output:

```text
{'Ana', 'Ben', 'Carlo'}
```

Sets do not keep duplicate values.

The display order may vary.

---

## Set Operations

```python
students = set()

students.add("Ana")
students.add("Ben")
students.add("Ana")

print(students)

students.remove("Ben")

print(students)
```

Output may be:

```text
{'Ana', 'Ben'}
{'Ana'}
```

Even if `"Ana"` is added twice, it appears only once.

---

## Checking Membership

Sets are useful for checking if a value exists.

```python
registered_students = {"Ana", "Ben", "Carlo"}

if "Ana" in registered_students:
    print("Ana is registered")
else:
    print("Ana is not registered")
```

Output:

```text
Ana is registered
```

Set membership checks are fast on average.

---

## Python Map Example Using Dictionary

```python
grades = {
    "Ana": 92,
    "Ben": 88,
    "Carlo": 95
}

print(grades["Ana"])
```

Output:

```text
92
```

The student name is the key.  
The grade is the value.

---

## Dictionary Operations

```python
grades = {}

grades["Ana"] = 92
grades["Ben"] = 88

grades["Ana"] = 94

print(grades)

del grades["Ben"]

print(grades)
```

Output:

```text
{'Ana': 94, 'Ben': 88}
{'Ana': 94}
```

---

## Frequency Counting

A dictionary can count how many times each value appears.

```python
names = ["Ana", "Ben", "Ana", "Carlo", "Ben", "Ana"]

frequency = {}

for name in names:
    if name in frequency:
        frequency[name] += 1
    else:
        frequency[name] = 1

print(frequency)
```

Output:

```text
{'Ana': 3, 'Ben': 2, 'Carlo': 1}
```

---

## Code Walkthrough

```python
frequency = {}
```

This creates an empty dictionary.

```python
for name in names:
```

This checks each name.

```python
if name in frequency:
    frequency[name] += 1
```

If the name already exists, add `1` to its count.

```python
else:
    frequency[name] = 1
```

If the name appears for the first time, start the count at `1`.

---

## List vs Set vs Map

| Structure | Stores | Allows Duplicates | Access Style |
|---|---|---|---|
| List | Ordered values | Yes | By index |
| Set | Unique values | No | By membership |
| Map | Key-value pairs | Keys must be unique | By key |

---

## When to Use a Set

Use a set when:

- You need unique values.
- You need fast membership checking.
- You want to remove duplicates.
- You need set operations like union and intersection.

Example:

```python
section_a = {"Ana", "Ben", "Carlo"}
section_b = {"Ben", "Dana", "Ella"}

print(section_a.intersection(section_b))
```

Output:

```text
{'Ben'}
```

---

## When to Use a Map

Use a map when:

- You need to connect keys to values.
- You need fast lookup.
- You need to count frequencies.
- You need to group information by an identifier.

Example:

```python
student = {
    "id": "2024001",
    "name": "Ana",
    "course": "BSIT"
}

print(student["course"])
```

Output:

```text
BSIT
```

---

## Time and Space Complexity

For Python sets and dictionaries:

| Operation | Average Complexity |
|---|---|
| Add | O(1) |
| Search | O(1) |
| Delete | O(1) |

Space complexity:

```text
O(n)
```

The worst case can be slower if many collisions happen.

---

## Common Mistakes

- Expecting sets to keep duplicates.
- Expecting sets to always display in insertion order.
- Confusing dictionary keys and values.
- Using a list when fast membership checking is needed.
- Trying to access a set item by index.
- Forgetting that dictionary keys must be unique.

---

## Real-World Applications

Sets and maps are used in:

- Removing duplicate student names.
- Checking attendance uniqueness.
- Counting word frequency.
- Looking up student records.
- Grouping users by role.
- Detecting repeated values.
- Tracking visited nodes in graph traversal.

---

## VisualDSA Integration

Use the VisualDSA Sets and Maps Visualizer to compare unique storage and key-value lookup.

Recommended interactions:

- Add duplicate values to a set.
- Check membership.
- Add key-value pairs to a map.
- Update an existing key.
- Count frequencies from a list.

Suggested VisualDSA route:

```text
/visualdsa/sets-and-maps-visualizer
```

Data that can be captured for analytics:

- Duplicate handling mistakes.
- Key-value confusion.
- Wrong frequency counting.
- Membership checking errors.
- Time spent choosing the correct structure.

---

## Practice Activity

Given this list:

```python
names = ["Ana", "Ben", "Ana", "Carlo", "Dana", "Ben", "Ana"]
```

Tasks:

1. Create a set of unique names.
2. Count how many times each name appears.
3. Display the most repeated name.
4. Explain why a set and a map are both useful in this task.

Reflection question:

When would a list be less useful than a set?

---

## Quick Check

1. What does a set store?
2. Does a set allow duplicates?
3. What does a map store?
4. What Python structure is commonly used as a map?
5. What structure is useful for counting frequency?

---

## Answer Key

1. A set stores unique values.
2. No.
3. A map stores key-value pairs.
4. A dictionary.
5. A dictionary is useful for frequency counting.

---

## Summary

Sets store unique values and support fast membership checking. Maps store key-value pairs and support fast lookup. In Python, sets and dictionaries are useful for uniqueness, counting, grouping, and record lookup.

---

## Previous and Next Lesson

Previous Lesson: [Lesson 27: Hash Tables](./lesson-27-hash-tables.md)  
Next Lesson: [Lesson 29: Tries](./lesson-29-tries.md)
