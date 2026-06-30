---
title: 수식 렌더링 예제
---

# 수식 렌더링 (KaTeX)

인라인 수식은 `$...$`, 블록 수식은 `$$...$$`로 작성합니다.

## 기본 수식

피타고라스 정리: $a^2 + b^2 = c^2$

오일러 항등식: $e^{i\pi} + 1 = 0$

## 블록 수식

이차방정식의 근의 공식:

$$x = \frac{-b \pm \sqrt{b^2 - 4ac}}{2a}$$

가우스 적분:

$$\int_{-\infty}^{\infty} e^{-x^2} dx = \sqrt{\pi}$$

테일러 급수:

$$e^x = \sum_{n=0}^{\infty} \frac{x^n}{n!} = 1 + x + \frac{x^2}{2!} + \frac{x^3}{3!} + \cdots$$

## 행렬

$$A = \begin{pmatrix} a_{11} & a_{12} \\ a_{21} & a_{22} \end{pmatrix}, \quad \det(A) = a_{11}a_{22} - a_{12}a_{21}$$

## 편미분 / 그래디언트

$$\nabla f = \left(\frac{\partial f}{\partial x}, \frac{\partial f}{\partial y}, \frac{\partial f}{\partial z}\right)$$
