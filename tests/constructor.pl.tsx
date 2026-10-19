import { expect, test, type Page } from '@playwright/test';

const bun1 = { name: 'Тестовая булка A', price: 100 };
const bun2 = { name: 'Тестовая булка B', price: 200 };
const filling = { name: 'Тестовая начинка' };
const userName = 'Тестовый пользователь';
const orderNumber = 12345;
const accessToken = 'mock-access-token';
const refreshToken = 'mock-refresh-token';

const openConstructor = async (page: Page): Promise<void> => {
  await page.goto('/');
  const bunList = page
    .getByRole('heading', { name: 'Булки' })
    .locator('xpath=following-sibling::ul[1]');
  await expect(bunList.locator('li')).toHaveCount(2);
};

const openIngredientModal = async (
  page: Page,
  ingredientName: string
): Promise<void> => {
  const card = page
    .getByRole('heading', { name: 'Булки' })
    .locator('xpath=following-sibling::ul[1]')
    .locator('li')
    .filter({ hasText: ingredientName });

  await card.getByRole('link', { name: ingredientName }).click();
};

const getConstructorTotal = (page: Page) => {
  return page.locator('[class*="total"]').getByText(/^\d+$/);
};

test.describe('Конструктор бургера', () => {
  test.beforeEach(async ({ page }) => {
    await page.routeFromHAR('tests/hars/ingredients.har', {
      url: '**/api/ingredients',
      update: false,
      notFound: 'abort',
    });
  });

  test('Добавление булки', async ({ page }) => {
    await openConstructor(page);
    const bunCard = page
      .getByRole('heading', { name: 'Булки' })
      .locator('xpath=following-sibling::ul[1]')
      .locator('li')
      .filter({ hasText: bun1.name });

    await bunCard.getByRole('button', { name: 'Добавить' }).click();

    await expect(page.getByText(`${bun1.name} (верх)`)).toBeVisible();
    await expect(page.getByText(`${bun1.name} (низ)`)).toBeVisible();

    await expect(getConstructorTotal(page)).toHaveText(String(bun1.price * 2));
  });

  test('Открытие модалки ингредиента', async ({ page }) => {
    await openConstructor(page);
    const modal = page.locator('#modals');

    await openIngredientModal(page, bun1.name);

    await expect(
      modal.getByRole('heading', { name: 'Детали ингредиента' })
    ).toBeVisible();
    await expect(modal.getByRole('heading', { name: bun1.name })).toBeVisible();

    await modal.getByRole('button', { name: 'Закрыть' }).click();
    await expect(modal.getByRole('heading', { name: 'Детали ингредиента' })).toHaveCount(
      0
    );

    await openIngredientModal(page, bun2.name);
    await expect(modal.getByRole('heading', { name: bun2.name })).toBeVisible();
  });

  test('Закрытие модалки ингредиента по крестику', async ({ page }) => {
    await openConstructor(page);
    const modal = page.locator('#modals');

    await openIngredientModal(page, bun1.name);
    await expect(
      modal.getByRole('heading', { name: 'Детали ингредиента' })
    ).toBeVisible();

    await modal.getByRole('button', { name: 'Закрыть' }).click();

    await expect(modal.getByRole('heading', { name: 'Детали ингредиента' })).toHaveCount(
      0
    );
  });

  test('Закрытие модалки ингредиента по оверлею', async ({ page }) => {
    await openConstructor(page);
    const modal = page.locator('#modals');

    await openIngredientModal(page, bun1.name);
    await expect(
      modal.getByRole('heading', { name: 'Детали ингредиента' })
    ).toBeVisible();

    await page.mouse.click(10, 10);

    await expect(modal.getByRole('heading', { name: 'Детали ингредиента' })).toHaveCount(
      0
    );
  });

  test('Создание бургера', async ({ page, context }) => {
    await context.addCookies([
      { name: 'accessToken', value: accessToken, url: 'http://localhost:4000' },
    ]);
    await page.addInitScript((token) => {
      localStorage.setItem('refreshToken', token);
    }, refreshToken);
    await page.routeFromHAR('tests/hars/user.har', {
      url: '**/api/auth/user',
      notFound: 'abort',
    });
    await page.routeFromHAR('tests/hars/feed.har', {
      url: '**/api/orders/all',
      notFound: 'abort',
    });
    await page.routeFromHAR('tests/hars/orders.har', {
      url: '**/api/orders',
      notFound: 'abort',
    });

    await openConstructor(page);
    await expect(page.getByRole('link', { name: userName })).toBeVisible();

    const bunCard = page
      .getByRole('heading', { name: 'Булки' })
      .locator('xpath=following-sibling::ul[1]')
      .locator('li')
      .filter({ hasText: bun1.name });
    await bunCard.getByRole('button', { name: 'Добавить' }).click();

    await expect(page.getByText(`${bun1.name} (верх)`)).toBeVisible();

    const fillingCard = page
      .getByRole('heading', { name: 'Начинки' })
      .locator('xpath=following-sibling::ul[1]')
      .locator('li')
      .filter({ hasText: filling.name });
    await fillingCard.getByRole('button', { name: 'Добавить' }).click();

    await expect(page.getByText(filling.name).last()).toBeVisible();

    const orderRequestPromise = page.waitForRequest(
      (request) => request.url().endsWith('/api/orders') && request.method() === 'POST'
    );
    await page.getByRole('button', { name: 'Оформить заказ' }).click();
    const orderRequest = await orderRequestPromise;
    expect(orderRequest.headers().authorization).toBe(accessToken);
    expect(orderRequest.postDataJSON()).toEqual({
      ingredients: ['test-bun-a', 'test-main-a', 'test-bun-a'],
    });

    const modal = page.locator('#modals');

    await expect(modal.getByText(String(orderNumber))).toBeVisible();

    await expect(page.getByText(`${bun1.name} (верх)`)).toHaveCount(0);
    await expect(page.getByText(`${bun1.name} (низ)`)).toHaveCount(0);

    await expect(page.getByText(filling.name)).toHaveCount(1);

    await expect(page.getByText('Выберите начинку')).toBeVisible();
    await expect(getConstructorTotal(page)).toHaveText('0');

    await modal.getByRole('button', { name: 'Закрыть' }).click();
    await expect(modal.getByText(String(orderNumber))).toHaveCount(0);
    await expect(modal.getByRole('button', { name: 'Закрыть' })).toHaveCount(0);
  });
});
