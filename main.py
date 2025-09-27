import pygame
import sys

# --- Constants ---
SIZE = 10
CELL_SIZE = 40
MARGIN = 2
WIDTH = SIZE * (CELL_SIZE + MARGIN) + MARGIN
HEIGHT = SIZE * (CELL_SIZE + MARGIN) + 125
FPS = 60

BLACK = (15, 15, 15)
WHITE = (240, 240, 240)
GREY = (200, 200, 200)
BG = (245, 247, 255)
BOARD_BG = (43, 47, 58)
HIGHLIGHT = (250, 204, 21)
BTN_COLOR = (14, 165, 233)
BTN_TEXT = (4, 42, 43)

# --- Init ---
pygame.init()
screen = pygame.display.set_mode((WIDTH, HEIGHT))
pygame.display.set_caption("3-in-a-Row — 16×16 (Gravity Rule)")
font = pygame.font.SysFont("Arial", 22, bold=True)
clock = pygame.time.Clock()

# --- Game State ---
grid = [[None] * SIZE for _ in range(SIZE)]
current_player = "black"
game_over = False
last_move = None
win_cells = []
preview_flash = False
preview_timer = 0

# --- Buttons ---
reset_btn = pygame.Rect(20, HEIGHT - 100, 120, 35)
preview_btn = pygame.Rect(160, HEIGHT - 100, 160, 35)


def reset():
    global grid, current_player, game_over, last_move, win_cells
    grid = [[None] * SIZE for _ in range(SIZE)]
    current_player = "black"
    game_over = False
    last_move = None
    win_cells = []


def place_piece(r, c):
    global last_move
    grid[r][c] = current_player
    last_move = (r, c)


def valid_move(r, c):
    if grid[r][c] is not None:
        return False
    if r == SIZE - 1:
        return True
    return grid[r + 1][c] is not None


def check_win(r, c):
    directions = [(1, 0), (0, 1), (1, 1), (1, -1)]
    for dr, dc in directions:
        cnt = 1
        cells = [(r, c)]

        cnt += count_same(r, c, dr, dc, cells)
        cnt += count_same(r, c, -dr, -dc, cells)

        if cnt >= 3:
            return cells
    return []


def count_same(r, c, dr, dc, cells):
    rr, cc = r + dr, c + dc
    cnt = 0
    while 0 <= rr < SIZE and 0 <= cc < SIZE and grid[rr][cc] == current_player:
        cells.append((rr, cc))
        cnt += 1
        rr += dr
        cc += dc
    return cnt


def draw_board():
    screen.fill(BG)
    pygame.draw.rect(screen, BOARD_BG, (0, 0, WIDTH, HEIGHT - 120))

    for r in range(SIZE):
        for c in range(SIZE):
            x = c * (CELL_SIZE + MARGIN) + MARGIN
            y = r * (CELL_SIZE + MARGIN) + MARGIN
            rect = pygame.Rect(x, y, CELL_SIZE, CELL_SIZE)

            if (r, c) in win_cells:
                pygame.draw.rect(screen, HIGHLIGHT, rect, border_radius=6)

            pygame.draw.rect(screen, WHITE, rect, border_radius=6)

            if grid[r][c] == "black":
                pygame.draw.circle(screen, BLACK, rect.center, CELL_SIZE // 2 - 4)
            elif grid[r][c] == "white":
                pygame.draw.circle(screen, WHITE, rect.center, CELL_SIZE // 2 - 4)
                pygame.draw.circle(screen, GREY, rect.center, CELL_SIZE // 2 - 4, 2)

            # Preview effect (highlight last move)
            if preview_flash and last_move == (r, c):
                pygame.draw.rect(screen, (0, 200, 255), rect, 3, border_radius=6)

    # Status Bar
    status_text = f"Player {current_player.capitalize()}'s turn"
    if game_over:
        status_text = f"Player {current_player.capitalize()} Wins! 🎉"
    status = font.render(status_text, True, (20, 20, 40))
    screen.blit(status, (20, HEIGHT - 50))

    # Buttons
    pygame.draw.rect(screen, BTN_COLOR, reset_btn, border_radius=6)
    pygame.draw.rect(screen, BTN_COLOR, preview_btn, border_radius=6)
    screen.blit(font.render("Restart", True, BTN_TEXT), (reset_btn.x + 20, reset_btn.y + 6))
    screen.blit(font.render("Show Last ON", True, BTN_TEXT), (preview_btn.x + 5, preview_btn.y + 6))


# --- Main Loop ---
reset()
running = True
while running:
    clock.tick(FPS)
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False

        elif event.type == pygame.MOUSEBUTTONDOWN:
            mx, my = event.pos

            if reset_btn.collidepoint(mx, my):
                reset()

            elif preview_btn.collidepoint(mx, my):
                if last_move:
                    preview_flash = True
                    preview_timer = pygame.time.get_ticks()

            elif my < HEIGHT - 120 and not game_over:
                c = mx // (CELL_SIZE + MARGIN)
                r = my // (CELL_SIZE + MARGIN)
                if 0 <= r < SIZE and 0 <= c < SIZE:
                    if valid_move(r, c):
                        place_piece(r, c)
                        win = check_win(r, c)
                        if win:
                            game_over = True
                            win_cells = win
                        else:
                            current_player = "white" if current_player == "black" else "black"

    # Turn off preview after short flash
    if preview_flash and pygame.time.get_ticks() - preview_timer > 400:
        preview_flash = False

    draw_board()
    pygame.display.flip()

pygame.quit()
sys.exit()
