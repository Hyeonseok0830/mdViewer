---
title: 구문 강조 예제
---

# 구문 강조 (Syntax Highlighting)

shiki를 이용해 GitHub 테마(라이트/다크)로 코드를 강조합니다.

## JavaScript

```javascript
async function fetchData(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

const data = await fetchData('https://api.example.com/items');
console.log(data);
```

## TypeScript

```typescript
interface User {
  id: number;
  name: string;
  email?: string;
}

function greet(user: User): string {
  return `안녕하세요, ${user.name}님!`;
}
```

## Python

```python
from dataclasses import dataclass
from typing import Optional

@dataclass
class Point:
    x: float
    y: float
    label: Optional[str] = None

    def distance(self, other: "Point") -> float:
        return ((self.x - other.x) ** 2 + (self.y - other.y) ** 2) ** 0.5

p1 = Point(0, 0, "원점")
p2 = Point(3, 4)
print(f"거리: {p1.distance(p2)}")  # 거리: 5.0
```

## Bash

```bash
#!/bin/bash
for file in *.md; do
  echo "처리 중: $file"
  wc -l "$file"
done
```

## JSON

```json
{
  "name": "mdViewer",
  "version": "0.1.0",
  "features": ["syntax", "math", "mermaid"],
  "settings": {
    "theme": "auto",
    "port": 3000
  }
}
```
