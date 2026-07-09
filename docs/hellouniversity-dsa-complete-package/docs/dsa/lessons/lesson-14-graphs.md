# Lesson 14: Graphs

**Course:** Data Structures and Algorithms  
**Section:** Non-Linear Data Structures  
**Level:** Intermediate  
**Estimated Time:** 35 to 45 minutes  
**Primary Language:** Python  
**VisualDSA Demo:** `/visualdsa/graph-builder`

---

## Lesson Overview

A graph is a non-linear data structure made of vertices and edges.

Graphs are used to represent relationships and connections.

Examples include:

- Social networks
- Maps
- Computer networks
- Course prerequisites
- Transportation systems

In this lesson, you will learn what graphs are, how they are represented, and when to use adjacency lists or adjacency matrices.

---

## Learning Objectives

At the end of this lesson, you should be able to:

- Define a graph.
- Identify vertices and edges.
- Differentiate directed and undirected graphs.
- Differentiate weighted and unweighted graphs.
- Represent graphs using an adjacency matrix.
- Represent graphs using an adjacency list.
- Explain real-world graph applications.

---

## Key Terms

| Term | Meaning |
|---|---|
| Graph | A structure made of vertices and edges |
| Vertex | A node in a graph |
| Edge | A connection between vertices |
| Directed Graph | A graph where edges have direction |
| Undirected Graph | A graph where edges have no direction |
| Weighted Graph | A graph where edges have values or costs |
| Unweighted Graph | A graph where edges have no costs |
| Adjacency List | A graph representation using lists of neighbors |
| Adjacency Matrix | A graph representation using a table |

---

## Simple Explanation

A graph shows connections.

Example:

```text
Ana is friends with Ben.
Ben is friends with Carlo.
Carlo is friends with Dana.
```

This can be represented as a graph:

```text
Ana -- Ben -- Carlo -- Dana
```

Each person is a vertex.  
Each friendship is an edge.

---

## Vertices and Edges

Example graph:

```text
A -- B
|    |
C -- D
```

Vertices:

```text
A, B, C, D
```

Edges:

```text
A-B, A-C, B-D, C-D
```

---

## Directed Graph

In a directed graph, edges have direction.

Example:

```text
A → B → C
```

This means:

- `A` points to `B`.
- `B` points to `C`.

But it does not automatically mean that `B` points to `A`.

Directed graphs are useful for:

- Webpage links.
- Course prerequisites.
- One-way roads.
- Task dependencies.

---

## Undirected Graph

In an undirected graph, edges have no direction.

Example:

```text
A -- B -- C
```

If `A` is connected to `B`, then `B` is also connected to `A`.

Undirected graphs are useful for:

- Friendships.
- Two-way roads.
- Local networks.
- Collaboration relationships.

---

## Weighted Graph

A weighted graph has values on edges.

Example:

```text
A --5-- B --2-- C
```

The values can represent:

- Distance.
- Cost.
- Time.
- Difficulty.
- Network latency.

---

## Adjacency Matrix

An adjacency matrix uses a table to show whether vertices are connected.

Graph:

```text
A -- B
|    |
C -- D
```

Matrix:

|   | A | B | C | D |
|---|---|---|---|---|
| A | 0 | 1 | 1 | 0 |
| B | 1 | 0 | 0 | 1 |
| C | 1 | 0 | 0 | 1 |
| D | 0 | 1 | 1 | 0 |

`1` means connected.  
`0` means not connected.

---

## Adjacency List

An adjacency list stores each vertex and its neighbors.

```python
graph = {
    "A": ["B", "C"],
    "B": ["A", "D"],
    "C": ["A", "D"],
    "D": ["B", "C"]
}

print(graph["A"])
```

Output:

```text
['B', 'C']
```

This means `A` is connected to `B` and `C`.

---

## Adjacency Matrix in Python

```python
vertices = ["A", "B", "C", "D"]

matrix = [
    [0, 1, 1, 0],
    [1, 0, 0, 1],
    [1, 0, 0, 1],
    [0, 1, 1, 0]
]

print(matrix[0][1])
```

Output:

```text
1
```

This means `A` and `B` are connected.

---

## Adjacency List vs Adjacency Matrix

| Feature | Adjacency List | Adjacency Matrix |
|---|---|---|
| Space use | Better for sparse graphs | Uses more space |
| Checking edge | Slower | Faster |
| Listing neighbors | Easier | Requires scanning row |
| Best for | Few connections | Many connections |

A sparse graph has fewer edges.  
A dense graph has many edges.

---

## Python Graph Example

```python
campus_graph = {
    "Gate": ["Library", "Canteen"],
    "Library": ["Gate", "Computer Lab"],
    "Canteen": ["Gate", "Gym"],
    "Computer Lab": ["Library"],
    "Gym": ["Canteen"]
}

for location, neighbors in campus_graph.items():
    print(location, "is connected to", neighbors)
```

Output:

```text
Gate is connected to ['Library', 'Canteen']
Library is connected to ['Gate', 'Computer Lab']
Canteen is connected to ['Gate', 'Gym']
Computer Lab is connected to ['Library']
Gym is connected to ['Canteen']
```

---

## Time and Space Complexity

For a graph with `V` vertices and `E` edges:

| Representation | Space Complexity |
|---|---|
| Adjacency List | O(V + E) |
| Adjacency Matrix | O(V²) |

Edge checking:

| Representation | Edge Check |
|---|---|
| Adjacency List | O(degree of vertex) |
| Adjacency Matrix | O(1) |

---

## Common Mistakes

- Confusing vertices with edges.
- Forgetting direction in directed graphs.
- Treating undirected edges as one-way.
- Using an adjacency matrix when a graph is very sparse.
- Forgetting to add both directions in an undirected adjacency list.
- Thinking all graphs must be visual maps.

---

## Real-World Applications

Graphs are used in:

- Social networks.
- Campus maps.
- Road navigation.
- Computer networks.
- Webpage links.
- Recommendation systems.
- Course prerequisite planning.
- Dependency tracking.

---

## VisualDSA Integration

Use the VisualDSA Graph Builder to create vertices and edges interactively.

Recommended interactions:

- Add vertices.
- Add directed or undirected edges.
- Add weighted edges.
- Switch between adjacency list and adjacency matrix.
- Identify neighbors of a selected vertex.

Suggested VisualDSA route:

```text
/visualdsa/graph-builder
```

Data that can be captured for analytics:

- Mistakes in identifying vertices and edges.
- Incorrect directed edge interpretation.
- Incorrect adjacency list construction.
- Confusion between matrix and list representation.
- Time spent creating a valid graph.

---

## Practice Activity

Represent a campus map as a graph.

Use at least five locations:

```text
Gate
Library
Computer Lab
Canteen
Gym
```

Create:

1. An adjacency list.
2. A short explanation of each connection.
3. A statement whether the graph is directed or undirected.

Reflection question:

Why is a graph better than a simple list for representing a campus map?

---

## Quick Check

1. What are the two main parts of a graph?
2. What is a directed graph?
3. What is a weighted graph?
4. What does an adjacency list store?
5. What does an adjacency matrix use?

---

## Answer Key

1. Vertices and edges.
2. A directed graph has edges with direction.
3. A weighted graph has values or costs on edges.
4. An adjacency list stores each vertex and its neighbors.
5. An adjacency matrix uses a table to show connections.

---

## Summary

A graph represents relationships between objects. Vertices represent the objects, and edges represent the connections. Graphs can be directed, undirected, weighted, or unweighted. They can be represented using adjacency lists or adjacency matrices.

---

## Previous and Next Lesson

Previous Lesson: [Lesson 13: Heaps](./lesson-13-heaps.md)  
Next Lesson: [Lesson 15: Graph Traversals](./lesson-15-graph-traversals.md)
