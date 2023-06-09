import { PrimeProcess } from "@distributed/types/common";

/**
 * function that checks if a number is prime or not.
 * @param number will always be a 5 digit input
 * @param start the start range for the sequence
 * @param end the end range for the sequences
 * @returns return prime response object.
 */
export const isPrime = (
  numberToCheck: number,
  start: number,
  end: number
): PrimeProcess => {
  const payload = {
    end,
    start,
    number: numberToCheck,
  };

  if (numberToCheck < 2) {
    return {
      action: "non-prime",
      payload: {
        ...payload,
        isPrime: false,
        message: "Number is not prime",
      },
    };
  }

  for (let i = Math.max(2, start); i <= Math.sqrt(numberToCheck) && i <= end; i++) {
    if (numberToCheck % i === 0) {
      return {
        action: "non-prime",
        payload: {
          ...payload,
          isPrime: false,
          divisibleBy: i,
          message: "Number is not prime",
        },
      };
    }
  }

  return {
    action: "prime",
    payload: {
      ...payload,
      isPrime: true,
      message: "Number is prime",
    },
  };
};

