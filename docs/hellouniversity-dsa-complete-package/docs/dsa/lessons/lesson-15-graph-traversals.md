# Lesson 15: Graph Traversals

**Course:** Data Structures and Algorithms  
**Section:** Non-Linear Data Structures  
**Level:** Intermediate  
**Estimated Time:** 40 to 50 minutes  
**Primary Language:** Python  
**VisualDSA Demo:** `/visualdsa/graph-traversal-visualizer`

---

## Lesson Overview

Graph traversal means visiting vertices in a graph.

Two common graph traversal algorithms are:

- Breadth-First Search, or BFS
- Depth-First Search, or DFS

BFS explores neighbors level by level.  
DFS explores as far as possible along one path before backtracking.

---

## Learning Objectives

At the end of this lesson, you should be able to:

- Define graph traversal.
- Explain Breadth-First Search.
- Explain Depth-First Search.
- Use a queue for BFS.
- Use recursion or a stack for DFS.
- Track visited vertices.
- Trace BFS and DFS step by step.
- Compare BFS and DFS use cases.

---

## Key Terms

| Term | Meaning |
|---|---|
| Graph Traversal | Visiting vertices in a graph |
| BFS | Breadth-First Search |
| DFS | Depth-First Search |
| Queue | Used in BFS |
| Stack | Can be used in DFS |
| Visited Set | A record of vertices already visited |
| Backtracking | Returning to a previous point when no unvisited path remains |

---

## Sample Graph

We will use this graph:

```text
A -- B -- D
|    |
C -- E
```

Adjacency list:

```python
graph = {
    "A": ["B", "C"],
    "B": ["A", "D", "E"],
    "C": ["A", "E"],
    "D": ["B"],
    "E": ["B", "C"]
}
```

---

## Why We Need a Visited Set

Graphs can contain cycles.

Example:

```text
A -- B
|    |
C -- E
```

If the program does not track visited vertices, it may keep moving between the same vertices.

A visited set prevents repeated processing.

---

## Breadth-First Search

BFS explores vertices level by level.

It uses a queue.

Starting from `A`:

```text
A → B → C → D → E
```

Possible BFS order:

| Step | Visit | Queue After Visit |
|---|---|---|
| 1 | A | B, C |
| 2 | B | C, D, E |
| 3 | C | D, E |
| 4 | D | E |
| 5 | E | Empty |

---

## BFS Python Code

```python
from collections import deque

def bfs(graph, start):
    visited = set()
    queue = deque()

    visited.add(start)
    queue.append(start)

    while queue:
        current = queue.popleft()
        print(current)

        for neighbor in graph[current]:
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append(neighbor)


graph = {
    "A": ["B", "C"],
    "B": ["A", "D", "E"],
    "C": ["A", "E"],
    "D": ["B"],
    "E": ["B", "C"]
}

bfs(graph, "A")
```

Output:

```text
A
B
C
D
E
```

---

## BFS Code Walkthrough

```python
visited = set()
```

This keeps track of visited vertices.

```python
queue = deque()
```

This creates a queue for BFS.

```python
visited.add(start)
queue.append(start)
```

The starting vertex is marked as visited and added to the queue.

```python
current = queue.popleft()
```

The next vertex is removed from the front of the queue.

```python
for neighbor in graph[current]:
```

The algorithm checks every neighbor of the current vertex.

---

## Depth-First Search

DFS explores as far as possible before backtracking.

Starting from `A`, one possible DFS order is:

```text
A → B → D → E → C
```

DFS may produce different valid outputs depending on neighbor order.

---

## DFS Python Code Using Recursion

```python
def dfs(graph, start, visited=None):
    if visited is None:
        visited = set()

    visited.add(start)
    print(start)

    for neighbor in graph[start]:
        if neighbor not in visited:
            dfs(graph, neighbor, visited)


graph = {
    "A": ["B", "C"],
    "B": ["A", "D", "E"],
    "C": ["A", "E"],
    "D": ["B"],
    "E": ["B", "C"]
}

dfs(graph, "A")
```

Possible output:

```text
A
B
D
E
C
```

---

## DFS Code Walkthrough

```python
if visited is None:
    visited = set()
```

This creates the visited set only once.

```python
visited.add(start)
```

This marks the current vertex as visited.

```python
for neighbor in graph[start]:
```

This checks all neighbors.

```python
if neighbor not in visited:
    dfs(graph, neighbor, visited)
```

If a neighbor has not been visited, DFS recursively visits it.

---

## BFS vs DFS

| Feature | BFS | DFS |
|---|---|---|
| Strategy | Visit level by level | Go deep first |
| Data structure | Queue | Stack or recursion |
| Good for | Shortest path in unweighted graphs | Exploring paths |
| Memory use | Can be high for wide graphs | Can be high for deep graphs |
| Output | Depends on neighbor order | Depends on neighbor order |

---

## When to Use BFS

Use BFS when you need:

- Shortest path in an unweighted graph.
- Level-by-level exploration.
- Finding nearby nodes first.
- Social network degree search.
- Minimum number of moves.

Example:

```text
Find the shortest number of steps from Gate to Gym.
```

---

## When to Use DFS

Use DFS when you need:

- Explore all possible paths.
- Detect cycles.
- Solve maze-like problems.
- Perform backtracking.
- Process dependency chains.

Example:

```text
Check if a path exists from one location to another.
```

---

## Time and Space Complexity

For both BFS and DFS:

| Measurement | Complexity |
|---|---|
| Time Complexity | O(V + E) |
| Space Complexity | O(V) |

Where:

- `V` is the number of vertices.
- `E` is the number of edges.

---

## Common Mistakes

- Forgetting the visited set.
- Adding vertices to visited too late.
- Confusing queue and stack behavior.
- Expecting only one correct DFS output.
- Assuming BFS always works on weighted shortest paths.
- Traversing only one part of a disconnected graph.

---

## Real-World Applications

Graph traversal is used in:

- Campus navigation.
- Social network search.
- Web crawling.
- Network routing.
- Recommendation systems.
- Game pathfinding.
- Dependency checking.
- AI search problems.

---

## VisualDSA Integration

Use the VisualDSA Graph Traversal Visualizer to compare BFS and DFS.

Recommended interactions:

- Select a start vertex.
- Choose BFS or DFS.
- Predict the next visited vertex.
- Watch the queue or stack update.
- Mark visited vertices.
- Compare traversal outputs.

Suggested VisualDSA route:

```text
/visualdsa/graph-traversal-visualizer
```

Data that can be captured for analytics:

- Wrong next-vertex predictions.
- Queue and stack confusion.
- Missed visited-set updates.
- BFS and DFS comparison errors.
- Time spent per traversal mode.
- Number of attempts before correct traversal.

---

## Practice Activity

Given this graph:

```python
graph = {
    "Gate": ["Library", "Canteen"],
    "Library": ["Gate", "Computer Lab"],
    "Canteen": ["Gate", "Gym"],
    "Computer Lab": ["Library"],
    "Gym": ["Canteen"]
}
```

Tasks:

1. Perform BFS starting from `Gate`.
2. Perform DFS starting from `Gate`.
3. Identify which traversal is better for finding the shortest path in an unweighted graph.
4. Explain why a visited set is needed.

---

## Quick Check

1. What does graph traversal mean?
2. What data structure does BFS use?
3. What data structure or technique does DFS use?
4. Why do we need a visited set?
5. Which traversal is usually better for shortest path in an unweighted graph?

---

## Answer Key

1. Graph traversal means visiting vertices in a graph.
2. BFS uses a queue.
3. DFS uses a stack or recursion.
4. A visited set prevents repeated visits and cycles.
5. BFS is usually better for shortest path in an unweighted graph.

---

## Summary

Graph traversal allows a program to visit vertices in a graph. BFS uses a queue and explores level by level. DFS uses recursion or a stack and explores deeply before backtracking. Both require a visited set to prevent repeated visits.

---

## Previous and Next Lesson

Previous Lesson: [Lesson 14: Graphs](./lesson-14-graphs.md)  
Next Lesson: [Lesson 16: Linear Search](./lesson-16-linear-search.md)
