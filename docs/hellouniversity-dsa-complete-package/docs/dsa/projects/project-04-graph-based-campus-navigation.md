# Project 4: Graph-Based Campus Navigation

**Course:** Data Structures and Algorithms  
**Section:** Applied DSA Projects  
**Level:** Intermediate  
**Estimated Time:** 75 to 120 minutes  
**Primary Language:** Python  
**VisualDSA Demo:** `/visualdsa/campus-navigation-graph`

---

## Project Overview

In this project, you will build a simple Graph-Based Campus Navigation program.

The system will represent campus locations as vertices and paths as edges.

Students can choose a starting location and a destination. The program will use graph traversal to find a path.

This project connects graphs, adjacency lists, BFS, and path finding.

---

## DSA Concepts Used

| Concept | How It Is Used |
|---|---|
| Graph | Represents campus locations and paths |
| Vertex | Represents one location |
| Edge | Represents a path between locations |
| Adjacency List | Stores connected locations |
| BFS | Finds a path in an unweighted graph |
| Queue | Supports BFS traversal |
| Visited Set | Prevents repeated visits |

---

## Problem Scenario

A student wants to know how to move from one campus location to another.

The campus has locations such as:

- Gate
- Library
- Canteen
- Computer Lab
- Gym
- Registrar
- Auditorium

Each location is connected to other nearby locations.

Your task is to represent this as a graph and find a route.

---

## Learning Objectives

After completing this project, you should be able to:

- Represent a campus map using a graph.
- Use an adjacency list in Python.
- Apply BFS to find a path.
- Track visited locations.
- Reconstruct a path from start to destination.
- Explain why graphs fit navigation problems.

---

## System Requirements

The program should include these features:

1. Display all campus locations.
2. Display connections for each location.
3. Ask for a starting location.
4. Ask for a destination.
5. Find a path using BFS.
6. Display the path if found.
7. Display a message if no path exists.

---

## Suggested Graph

```python
campus_graph = {
    "Gate": ["Library", "Canteen"],
    "Library": ["Gate", "Computer Lab", "Registrar"],
    "Canteen": ["Gate", "Gym"],
    "Computer Lab": ["Library", "Auditorium"],
    "Registrar": ["Library", "Auditorium"],
    "Gym": ["Canteen", "Auditorium"],
    "Auditorium": ["Computer Lab", "Registrar", "Gym"]
}
```

This graph is undirected.

If `Gate` is connected to `Library`, then `Library` should also be connected to `Gate`.

---

## Sample Menu

```text
Graph-Based Campus Navigation

1. View locations
2. View connections
3. Find path
4. Exit

Enter choice:
```

---

## Sample Output

Find path:

```text
Enter starting location: Gate
Enter destination: Auditorium

Path found:
Gate -> Library -> Computer Lab -> Auditorium
```

If location is invalid:

```text
Location not found. Please check the spelling.
```

If no path exists:

```text
No path found.
```

---

## Starter Code

```python
from collections import deque

campus_graph = {
    "Gate": ["Library", "Canteen"],
    "Library": ["Gate", "Computer Lab", "Registrar"],
    "Canteen": ["Gate", "Gym"],
    "Computer Lab": ["Library", "Auditorium"],
    "Registrar": ["Library", "Auditorium"],
    "Gym": ["Canteen", "Auditorium"],
    "Auditorium": ["Computer Lab", "Registrar", "Gym"]
}


def view_locations():
    print("Campus locations:")

    for location in campus_graph:
        print("-", location)


def view_connections():
    print("Campus connections:")

    for location, neighbors in campus_graph.items():
        print(location, "is connected to", neighbors)


def find_path(start, destination):
    if start not in campus_graph or destination not in campus_graph:
        return None

    queue = deque()
    visited = set()

    queue.append((start, [start]))
    visited.add(start)

    while queue:
        current, path = queue.popleft()

        if current == destination:
            return path

        for neighbor in campus_graph[current]:
            if neighbor not in visited:
                visited.add(neighbor)
                queue.append((neighbor, path + [neighbor]))

    return None


while True:
    print("\nGraph-Based Campus Navigation")
    print("1. View locations")
    print("2. View connections")
    print("3. Find path")
    print("4. Exit")

    choice = input("Enter choice: ")

    if choice == "1":
        view_locations()
    elif choice == "2":
        view_connections()
    elif choice == "3":
        start = input("Enter starting location: ")
        destination = input("Enter destination: ")

        path = find_path(start, destination)

        if path is None:
            print("No path found.")
        else:
            print("Path found:")
            print(" -> ".join(path))
    elif choice == "4":
        print("Program ended.")
        break
    else:
        print("Invalid choice.")
```

---

## Code Walkthrough

The campus map is represented using an adjacency list.

```python
campus_graph = {
    "Gate": ["Library", "Canteen"]
}
```

`Gate` is a vertex.

`Library` and `Canteen` are neighboring vertices.

The BFS queue stores:

```python
(current_location, path_so_far)
```

Example:

```python
("Library", ["Gate", "Library"])
```

The visited set prevents the program from visiting the same location repeatedly.

---

## BFS Path Finding Logic

BFS works well for unweighted graphs because it explores nearby locations first.

Process:

1. Start from the selected location.
2. Add it to the queue.
3. Visit connected locations.
4. Track the path taken.
5. Stop when the destination is found.

---

## Time Complexity Guide

Let:

- `V` be the number of locations.
- `E` be the number of paths.

| Operation | Time Complexity |
|---|---|
| View locations | O(V) |
| View connections | O(V + E) |
| Find path using BFS | O(V + E) |
| Check valid location | O(1) average |

---

## VisualDSA Integration

Use the VisualDSA Campus Navigation Graph demo to build and traverse the map.

Suggested VisualDSA route:

```text
/visualdsa/campus-navigation-graph
```

Recommended interactions:

- Add campus locations.
- Add paths between locations.
- Choose start and destination.
- Highlight BFS queue updates.
- Show visited locations.
- Display final path.

Data that can be captured for analytics:

- Incorrect graph representation.
- Missing bidirectional edges.
- BFS traversal mistakes.
- Visited set errors.
- Path reconstruction mistakes.
- Completion status.

---

## Project Checklist

Your output should include:

- Campus graph represented using adjacency list.
- View locations feature.
- View connections feature.
- Find path feature.
- BFS implementation.
- Invalid location handling.
- No path handling.
- Clear path output.

---

## Suggested Improvements

After completing the basic version, improve the program by adding:

- Weighted paths based on distance.
- Shortest path using Dijkstra’s algorithm.
- Location categories.
- Add or remove locations.
- Add or remove paths.
- Save campus map to a file.
- Visual map in a web interface.

---

## Rubric

| Criteria | Points |
|---|---:|
| Correct graph representation | 20 |
| View locations and connections work | 15 |
| BFS path finding works | 25 |
| Visited set is used correctly | 10 |
| Path output is clear | 10 |
| Invalid input handling | 10 |
| Code readability and organization | 5 |
| Reflection answers | 5 |
| Total | 100 |

---

## Reflection Questions

1. Why is a graph useful for campus navigation?
2. What do vertices and edges represent in this project?
3. Why does BFS work for finding a path in this project?
4. Why is a visited set needed?
5. What would change if paths had distances or travel times?

---

## Related Lessons

- [Lesson 14: Graphs](../lessons/lesson-14-graphs.md)
- [Lesson 15: Graph Traversals](../lessons/lesson-15-graph-traversals.md)
- [Lesson 9: Queues](../lessons/lesson-09-queues.md)
- [Lesson 30: DSA Review and Integration](../lessons/lesson-30-dsa-review-and-integration.md)
