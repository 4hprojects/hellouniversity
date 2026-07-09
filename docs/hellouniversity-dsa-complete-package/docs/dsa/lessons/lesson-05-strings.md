---
title: "Lesson 5: Strings"
slug: "/data-structures-and-algorithms/strings"
section: "Linear Data Structures"
lesson_number: 5
level: "Beginner"
estimated_time: "35 to 45 minutes"
primary_language: "Python"
related_visualdsa: "/visualdsa/string-visualizer"
---

# Lesson 5: Strings

## Lesson Header

- **Course:** Data Structures and Algorithms
- **Section:** Linear Data Structures
- **Lesson:** 5
- **Level:** Beginner
- **Estimated time:** 35 to 45 minutes
- **Primary language:** Python
- **Related VisualDSA page:** `/visualdsa/string-visualizer`

## Lesson Overview

A string is a sequence of characters.

Strings are used to store text such as names, words, messages, usernames, email addresses, and codes.

In DSA, strings are important because many problems involve processing characters one by one.

Examples:

- Check if a word is a palindrome
- Count vowels
- Search for a character
- Reverse a word
- Validate an email format
- Compare two strings

Although strings look simple, they are used in many real-world programs.

## Learning Objectives

At the end of this lesson, you should be able to:

- Define a string
- Access characters by index
- Traverse a string
- Count characters
- Reverse a string
- Check for a palindrome
- Explain why strings can be treated like sequences
- Identify basic string operation complexity

## Key Terms

| Term | Meaning |
|---|---|
| String | A sequence of characters |
| Character | A single symbol, letter, number, or space |
| Index | Position of a character in the string |
| Traversal | Visiting each character one by one |
| Substring | A smaller part of a string |
| Palindrome | A word or phrase that reads the same forward and backward |
| Immutable | Cannot be changed directly after creation |

## Simple Explanation

A string is like an array of characters.

Example:

```text
HELLO
```

It can be viewed like this:

| Index | 0 | 1 | 2 | 3 | 4 |
|---|---|---|---|---|---|
| Character | H | E | L | L | O |

The character at index 0 is H.

The character at index 1 is E.

The character at index 4 is O.

Just like arrays, string indexing usually starts at 0.

## Python String Example

```python
word = "HELLO"

print(word[0])
print(word[4])
```

Output:

```text
H
O
```

## Code Walkthrough

```python
word = "HELLO"
```

This creates a string named `word`.

```python
print(word[0])
```

This displays the first character.

```python
print(word[4])
```

This displays the last character in the word HELLO.

## Traversing a String

Traversal means visiting each character one by one.

```python
word = "HELLO"

for character in word:
    print(character)
```

Output:

```text
H
E
L
L
O
```

## Traversing with Index

```python
word = "HELLO"

for index in range(len(word)):
    print(index, word[index])
```

Output:

```text
0 H
1 E
2 L
3 L
4 O
```

## Step-by-Step Trace

| Step | Index | Character |
|---:|---:|---|
| 1 | 0 | H |
| 2 | 1 | E |
| 3 | 2 | L |
| 4 | 3 | L |
| 5 | 4 | O |

This is useful when solving string problems.

## Counting Characters

You can use `len()` to count the number of characters.

```python
word = "HELLO"

print(len(word))
```

Output:

```text
5
```

Spaces are also counted.

```python
message = "HI ANA"

print(len(message))
```

Output:

```text
6
```

The space between HI and ANA is one character.

## Counting Vowels

```python
word = "education"
vowels = "aeiou"
count = 0

for character in word:
    if character in vowels:
        count += 1

print("Number of vowels:", count)
```

Output:

```text
Number of vowels: 5
```

## Code Walkthrough

```python
word = "education"
```

This stores the word to check.

```python
vowels = "aeiou"
```

This stores the vowel characters.

```python
count = 0
```

This prepares a counter.

```python
for character in word:
```

This checks every character in the word.

```python
if character in vowels:
```

This checks if the current character is a vowel.

```python
count += 1
```

This increases the count when a vowel is found.

## Reversing a String

Python allows slicing to reverse a string.

```python
word = "HELLO"
reversed_word = word[::-1]

print(reversed_word)
```

Output:

```text
OLLEH
```

You can also reverse manually.

```python
word = "HELLO"
reversed_word = ""

for character in word:
    reversed_word = character + reversed_word

print(reversed_word)
```

Output:

```text
OLLEH
```

## Palindrome Checking

A palindrome reads the same forward and backward.

Examples:

- madam
- level
- radar
- civic

Python example:

```python
word = "madam"

if word == word[::-1]:
    print("Palindrome")
else:
    print("Not a palindrome")
```

Output:

```text
Palindrome
```

## Palindrome Trace

Word:

```text
madam
```

| Index | Character from Left | Character from Right | Match? |
|---:|---|---|---|
| 0 | m | m | Yes |
| 1 | a | a | Yes |
| 2 | d | d | Yes |

The word is a palindrome because the characters match from both sides.

## Strings Are Immutable in Python

In Python, strings are immutable.

This means you cannot directly change one character inside a string.

Example:

```python
word = "HELLO"
word[0] = "Y"
```

This will cause an error.

A better approach is to create a new string.

```python
word = "HELLO"
new_word = "Y" + word[1:]

print(new_word)
```

Output:

```text
YELLO
```

## Time and Space Complexity

| Operation | Common Time Complexity | Explanation |
|---|---|---|
| Access by index | O(1) | Direct access to a known position |
| Traverse string | O(n) | Visits each character |
| Search for character | O(n) | May check all characters |
| Reverse string | O(n) | Processes all characters |
| Palindrome check | O(n) | Compares characters |

Space complexity depends on the operation.

Creating a reversed copy of a string uses extra memory.

## Common Mistakes

- Forgetting that string indexes start at 0
- Ignoring spaces when counting characters
- Treating uppercase and lowercase as the same without conversion
- Trying to directly modify a character in a Python string
- Forgetting that punctuation may affect palindrome checks

Example:

```python
word = "Madam"

print(word == word[::-1])
```

This returns `False` because uppercase M and lowercase m are different.

A better version:

```python
word = "Madam".lower()

print(word == word[::-1])
```

## Real-World Applications

Strings are used in:

- Usernames
- Password checks
- Email validation
- Search bars
- Chat messages
- File names
- Web forms
- URL slugs
- Text processing
- Natural language processing

For HelloUniversity, strings are important because lesson titles, user answers, search keywords, and code submissions all involve text.

## Interactive Learning

Use VisualDSA to explore string operations.

Recommended VisualDSA activity:

- Open `/visualdsa/string-visualizer`
- Enter a word
- View each character by index
- Step through traversal
- Count vowels
- Reverse the word
- Check if the word is a palindrome

### Student Actions

The student should be able to:

- Select a character by index
- Predict the next character during traversal
- Compare left and right characters in palindrome checking
- Identify why a word passes or fails the palindrome test

### VisualDSA Data to Capture

For this lesson, VisualDSA may capture:

- Incorrect index selections
- Palindrome prediction accuracy
- Character comparison mistakes
- Time spent on string tracing
- Number of attempts before correct answer

## Practice Activity

Create a Python program that checks if a word is a palindrome.

### Requirements

Your program should:

- Ask the user to enter a word
- Convert the word to lowercase
- Reverse the word
- Check if the original word and reversed word are the same
- Display whether the word is a palindrome

### Starter Code

```python
word = input("Enter a word: ").lower()

# Add your code here
```

### Sample Output

```text
Enter a word: Level
Level is a palindrome.
```

## Quick Check

Answer the following questions.

1. What is a string?
2. What is the index of the first character?
3. What does string traversal mean?
4. What is a palindrome?
5. Why can directly changing `word[0]` cause an error in Python?

## Answer Key

1. A string is a sequence of characters.
2. The first character is at index 0.
3. Traversal means visiting each character one by one.
4. A palindrome reads the same forward and backward.
5. Python strings are immutable, so their characters cannot be changed directly.

## Summary

Strings store text as a sequence of characters.

Like arrays, strings use indexes.

You can traverse strings, count characters, search characters, reverse words, and check palindromes.

String processing is a common skill in programming and DSA.

## Previous and Next Lesson

- Previous lesson: Lesson 4, Arrays
- Next lesson: Lesson 6, Recursion
