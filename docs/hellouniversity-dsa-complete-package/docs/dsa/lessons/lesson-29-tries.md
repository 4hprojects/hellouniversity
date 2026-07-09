# Lesson 29: Tries

**Course:** Data Structures and Algorithms  
**Section:** Hashing, Maps, Tries, and Dynamic Programming  
**Level:** Intermediate  
**Estimated Time:** 40 to 50 minutes  
**Primary Language:** Python  
**VisualDSA Demo:** `/visualdsa/trie-visualizer`

---

## Lesson Overview

A trie is a tree-like data structure used to store strings.

It is also called a prefix tree.

Tries are useful for problems involving words, prefixes, autocomplete, dictionaries, and search suggestions.

---

## Learning Objectives

At the end of this lesson, you should be able to:

- Define a trie.
- Explain why a trie is called a prefix tree.
- Insert words into a trie.
- Search for a word in a trie.
- Check whether a prefix exists.
- Implement a basic trie in Python.
- Identify practical uses of tries.

---

## Key Terms

| Term | Meaning |
|---|---|
| Trie | A tree-like structure used to store strings |
| Prefix Tree | Another name for trie |
| Prefix | The beginning part of a word |
| Character Node | A node that represents a character |
| End Marker | A marker showing a complete word |
| Autocomplete | Suggesting words based on a prefix |
| Root | The starting node of a trie |

---

## Simple Explanation

A trie stores words one character at a time.

Example words:

```text
cat
car
care
dog
```

Trie idea:

```text
root
├── c
│   └── a
│       ├── t
│       └── r
│           └── e
└── d
    └── o
        └── g
```

Words with the same prefix share the same path.

`cat`, `car`, and `care` all share:

```text
c → a
```

---

## Why Tries Are Useful

A trie is useful when you need to answer questions like:

- Does this word exist?
- Does any word start with this prefix?
- What words can be suggested after typing these letters?
- How many words share this prefix?

Example:

If the user types:

```text
ca
```

Possible suggestions:

```text
cat
car
care
```

---

## Trie Node Structure

Each trie node needs:

1. A collection of children.
2. A marker to show if a word ends there.

Python node:

```python
class TrieNode:
    def __init__(self):
        self.children = {}
        self.is_end_of_word = False
```

`children` stores the next characters.  
`is_end_of_word` marks a complete word.

---

## Trie Class

```python
class Trie:
    def __init__(self):
        self.root = TrieNode()
```

The trie starts with an empty root node.

The root does not represent a character.

---

## Insert Operation

```python
class TrieNode:
    def __init__(self):
        self.children = {}
        self.is_end_of_word = False


class Trie:
    def __init__(self):
        self.root = TrieNode()

    def insert(self, word):
        current = self.root

        for character in word:
            if character not in current.children:
                current.children[character] = TrieNode()

            current = current.children[character]

        current.is_end_of_word = True
```

---

## Insert Code Walkthrough

```python
current = self.root
```

Start at the root.

```python
for character in word:
```

Go through each character in the word.

```python
if character not in current.children:
    current.children[character] = TrieNode()
```

If the character path does not exist, create it.

```python
current = current.children[character]
```

Move to the next character node.

```python
current.is_end_of_word = True
```

Mark the final node as the end of a complete word.

---

## Search Operation

```python
def search(self, word):
    current = self.root

    for character in word:
        if character not in current.children:
            return False

        current = current.children[character]

    return current.is_end_of_word
```

This returns `True` only if the complete word exists.

---

## Prefix Check Operation

```python
def starts_with(self, prefix):
    current = self.root

    for character in prefix:
        if character not in current.children:
            return False

        current = current.children[character]

    return True
```

This returns `True` if the prefix path exists.

---

## Complete Trie Example

```python
class TrieNode:
    def __init__(self):
        self.children = {}
        self.is_end_of_word = False


class Trie:
    def __init__(self):
        self.root = TrieNode()

    def insert(self, word):
        current = self.root

        for character in word:
            if character not in current.children:
                current.children[character] = TrieNode()

            current = current.children[character]

        current.is_end_of_word = True

    def search(self, word):
        current = self.root

        for character in word:
            if character not in current.children:
                return False

            current = current.children[character]

        return current.is_end_of_word

    def starts_with(self, prefix):
        current = self.root

        for character in prefix:
            if character not in current.children:
                return False

            current = current.children[character]

        return True


trie = Trie()

trie.insert("cat")
trie.insert("car")
trie.insert("care")
trie.insert("dog")

print(trie.search("car"))
print(trie.search("cap"))
print(trie.starts_with("ca"))
```

Output:

```text
True
False
True
```

---

## Step-by-Step Insert Trace

Insert word:

```text
cat
```

| Step | Character | Action |
|---|---|---|
| 1 | c | Create node c |
| 2 | a | Create node a under c |
| 3 | t | Create node t under a |
| 4 | end | Mark t as end of word |

Insert word:

```text
car
```

| Step | Character | Action |
|---|---|---|
| 1 | c | Reuse existing c |
| 2 | a | Reuse existing a |
| 3 | r | Create node r under a |
| 4 | end | Mark r as end of word |

---

## Search vs Prefix Check

If the trie contains:

```text
car
care
```

Then:

| Query | Search Result | Prefix Result |
|---|---|---|
| car | True | True |
| ca | False | True |
| care | True | True |
| cap | False | False |

`ca` is a prefix, but not a complete word.

---

## Time and Space Complexity

Let `m` be the length of the word.

| Operation | Time Complexity |
|---|---|
| Insert word | O(m) |
| Search word | O(m) |
| Prefix check | O(m) |

Space complexity:

```text
O(total characters stored)
```

Tries can use more memory than simple lists because each node stores child references.

---

## Common Mistakes

- Forgetting to mark the end of a word.
- Treating every prefix as a complete word.
- Confusing trie with binary tree.
- Storing the full word in every node.
- Forgetting to move to the next node.
- Not understanding shared prefixes.

---

## Real-World Applications

Tries are used in:

- Autocomplete.
- Spell checking.
- Search suggestions.
- Dictionary word lookup.
- Prefix matching.
- IP routing concepts.
- Word games.
- Contact search systems.

---

## VisualDSA Integration

Use the VisualDSA Trie Visualizer to build words character by character.

Recommended interactions:

- Insert a word.
- Search for a complete word.
- Check a prefix.
- Highlight shared prefixes.
- Build autocomplete suggestions.

Suggested VisualDSA route:

```text
/visualdsa/trie-visualizer
```

Data that can be captured for analytics:

- Missed end-of-word marker.
- Prefix and word confusion.
- Incorrect child path prediction.
- Time spent tracing insertion.
- Autocomplete suggestion accuracy.

---

## Practice Activity

Create a trie and insert these words:

```text
code
coder
coding
cat
car
```

Tasks:

1. Search for `code`.
2. Search for `cod`.
3. Check if `cod` is a prefix.
4. Check if `ca` is a prefix.
5. Explain why `cod` may be a prefix but not a complete word.

Reflection question:

Why is a trie useful for autocomplete?

---

## Quick Check

1. What is a trie?
2. Why is it called a prefix tree?
3. What does `is_end_of_word` mean?
4. What is the time complexity of searching a word of length `m`?
5. Give one real-world use of a trie.

---

## Answer Key

1. A trie is a tree-like structure used to store strings.
2. Words with the same prefix share the same path.
3. It marks that a complete word ends at that node.
4. O(m).
5. Autocomplete, spell checking, search suggestions, or dictionary lookup.

---

## Summary

A trie stores words character by character and allows fast word and prefix lookup. It is useful for autocomplete, dictionaries, and search suggestions because shared prefixes are stored only once.

---

## Previous and Next Lesson

Previous Lesson: [Lesson 28: Sets and Maps](./lesson-28-sets-and-maps.md)  
Next Lesson: [Lesson 30: DSA Review and Integration](./lesson-30-dsa-review-and-integration.md)
